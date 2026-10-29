/*
 * Sharp completed-ink presentation for Markdown note editors.
 *
 * The bundle injector places this helper beside the existing SVG geometry
 * builder. It owns only the SVG surfaces and keyed path nodes; note storage,
 * hit testing, gestures, and live Pencil ink remain in the editor controller.
 */
var HandwritingCommittedSvg = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const DEFAULT_OVERSCAN = 128;
  const GEOMETRY_CACHE_LIMIT = 2048;
  const VALID_MODES = new Set(["svg", "canvas"]);

  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const text = value => String(value ?? "");
  const layerFor = stroke => stroke?.tool === "highlighter" ? "highlighter" : "pen";
  const strokeKey = stroke => `${layerFor(stroke)}:${text(stroke?.id)}`;
  const coverageRect = value => {
    if (!value) return null;
    const x = finite(value.x, NaN);
    const y = finite(value.y, NaN);
    const width = finite(value.width, NaN);
    const height = finite(value.height, NaN);
    return Number.isFinite(x) && Number.isFinite(y) && width > 0 && height > 0
      ? { x, y, width, height }
      : null;
  };
  const sameCoverage = (first, second) => !!first === !!second
    && (!first || first.x === second.x && first.y === second.y
      && first.width === second.width && first.height === second.height);

  const fallbackRevision = stroke => {
    const points = Array.isArray(stroke?.points) ? stroke.points : [];
    const first = points[0] ?? {};
    const last = points[points.length - 1] ?? {};
    const box = stroke?.bbox ?? {};
    return [
      points.length,
      box.x, box.y, box.width, box.height,
      first.x, first.y, first.pressure,
      last.x, last.y, last.pressure,
      stroke?.width, stroke?.color, stroke?.inkStyle,
    ].map(text).join("|");
  };

  const setStyle = (node, property, value) => {
    if (node?.style) node.style[property] = value;
  };

  const create = (root, options = {}) => {
    if (!root || typeof root.insertBefore !== "function") {
      throw new Error("HandwritingCommittedSvg requires an SVG root host");
    }
    const doc = options.document ?? root.ownerDocument;
    if (!doc || typeof doc.createElementNS !== "function") {
      throw new Error("HandwritingCommittedSvg requires an owner document");
    }

    const makeLayer = (className, before, opacity) => {
      const node = doc.createElementNS(SVG_NS, "svg");
      node.setAttribute("class", className);
      node.setAttribute("aria-hidden", "true");
      node.setAttribute("focusable", "false");
      node.setAttribute("preserveAspectRatio", "none");
      node.setAttribute("fill-rule", "nonzero");
      setStyle(node, "position", "absolute");
      setStyle(node, "inset", "0");
      setStyle(node, "width", "100%");
      setStyle(node, "height", "100%");
      setStyle(node, "pointerEvents", "none");
      setStyle(node, "display", "none");
      if (opacity !== undefined) setStyle(node, "opacity", String(opacity));
      root.insertBefore(node, before ?? null);
      return node;
    };

    const highlighter = makeLayer(
      "handwriting-committed-svg handwriting-committed-svg-highlighter",
      options.highlighterBefore,
      options.highlighterOpacity,
    );
    const pen = makeLayer(
      "handwriting-committed-svg handwriting-committed-svg-pen",
      options.penBefore,
    );
    const layers = { pen, highlighter };
    const nodes = new Map();
    const nodeLayers = new Map();
    const geometryCache = new Map();
    let geometryClock = 0;
    let lastStrokes = [];
    let mode = "canvas";
    let viewport = null;
    let stats = {
      reconciliations: 0,
      pathsCreated: 0,
      geometryHits: 0,
      geometryMisses: 0,
      visiblePen: 0,
      visibleHighlighter: 0,
      lastMs: 0,
      lastIncrementalMs: 0,
      incrementalUpserts: 0,
      attributeWrites: 0,
      geometryEvictions: 0,
      lastError: null,
    };

    const setAttributeIfChanged = (node, name, value) => {
      const next = text(value);
      if (node.getAttribute?.(name) === next) return false;
      node.setAttribute(name, next);
      stats.attributeWrites++;
      return true;
    };

    const setLayerVisibility = () => {
      const visible = mode === "svg" ? "" : "none";
      setStyle(pen, "display", visible);
      setStyle(highlighter, "display", visible);
    };

    const setViewport = next => {
      const width = Math.max(1, finite(next?.width, 1));
      const height = Math.max(1, finite(next?.height, 1));
      const zoom = Math.max(0.01, finite(next?.zoom, 1));
      const x = finite(next?.x, 0);
      const y = finite(next?.y, 0);
      const viewWidth = width / zoom;
      const viewHeight = height / zoom;
      const nextViewport = {
        x, y, width, height, zoom,
        viewWidth, viewHeight,
        overscan: Math.max(0, finite(next?.overscan, DEFAULT_OVERSCAN)),
        coverage: coverageRect(next?.coverage),
      };
      const changed = !viewport
        || ["x", "y", "width", "height", "zoom", "viewWidth", "viewHeight", "overscan"]
          .some(key => nextViewport[key] !== viewport[key])
        || !sameCoverage(nextViewport.coverage, viewport.coverage);
      viewport = nextViewport;
      if (!changed) return false;
      const viewBox = `${x} ${y} ${viewWidth} ${viewHeight}`;
      for (const layer of Object.values(layers)) {
        setAttributeIfChanged(layer, "viewBox", viewBox);
        setAttributeIfChanged(layer, "width", String(width));
        setAttributeIfChanged(layer, "height", String(height));
      }
      return true;
    };

    const getViewportViewBox = () => viewport
      ? `${viewport.x} ${viewport.y} ${viewport.viewWidth} ${viewport.viewHeight}`
      : null;

    const visible = stroke => {
      if (!viewport || !stroke?.bbox) return true;
      const box = stroke.bbox;
      const retained = viewport.coverage;
      const margin = viewport.overscan / viewport.zoom;
      const left = retained?.x ?? viewport.x - margin;
      const top = retained?.y ?? viewport.y - margin;
      const right = retained ? retained.x + retained.width : viewport.x + viewport.viewWidth + margin;
      const bottom = retained ? retained.y + retained.height : viewport.y + viewport.viewHeight + margin;
      return Number.isFinite(box.x) && Number.isFinite(box.y)
        && Number.isFinite(box.width) && Number.isFinite(box.height)
        && box.x <= right && box.y <= bottom
        && box.x + box.width >= left && box.y + box.height >= top;
    };

    const removeNode = key => {
      const node = nodes.get(key);
      if (node) node.remove?.();
      nodes.delete(key);
      nodeLayers.delete(key);
    };

    const removeKey = key => {
      removeNode(key);
      geometryCache.delete(key);
    };

    const trimGeometryCache = () => {
      while (geometryCache.size > GEOMETRY_CACHE_LIMIT) {
        let oldestKey = null;
        let oldestUse = Infinity;
        for (const [key, record] of geometryCache) {
          if ((record.lastUsed ?? 0) < oldestUse) {
            oldestKey = key;
            oldestUse = record.lastUsed ?? 0;
          }
        }
        if (oldestKey === null) break;
        geometryCache.delete(oldestKey);
        stats.geometryEvictions++;
      }
    };

    const renderStroke = stroke => {
      if (!stroke) return { key: "", visible: false, created: false };
      const key = strokeKey(stroke);
      const layerName = layerFor(stroke);
      const layer = layers[layerName];
      const wasVisible = nodes.has(key);
      if (!visible(stroke)) {
        removeNode(key);
        return { key, visible: false, created: wasVisible };
      }
      const revision = options.revision ? options.revision(stroke) : fallbackRevision(stroke);
      let record = geometryCache.get(key);
      if (!record || record.revision !== revision) {
        const d = options.path?.(stroke);
        if (typeof d !== "string" || d.trim() === "") {
          removeKey(key);
          return { key, visible: false, created: wasVisible };
        }
        record = { revision, d, lastUsed: ++geometryClock };
        geometryCache.set(key, record);
        stats.geometryMisses++;
      } else {
        record.lastUsed = ++geometryClock;
        stats.geometryHits++;
      }
      trimGeometryCache();
      let node = nodes.get(key);
      let created = false;
      if (!node) {
        node = doc.createElementNS(SVG_NS, "path");
        setAttributeIfChanged(node, "fill-rule", "nonzero");
        setStyle(node, "pointerEvents", "none");
        nodes.set(key, node);
        nodeLayers.set(key, layerName);
        stats.pathsCreated++;
        created = true;
      }
      setAttributeIfChanged(node, "d", record.d);
      setAttributeIfChanged(node, "fill", options.color?.(stroke) ?? stroke.color ?? "#000000");
      if (node.parentNode !== layer) layer.appendChild(node);
      return { key, visible: true, created };
    };

    const refreshVisibleCounts = () => {
      let visiblePen = 0;
      let visibleHighlighter = 0;
      for (const layerName of nodeLayers.values()) {
        layerName === "highlighter" ? visibleHighlighter++ : visiblePen++;
      }
      stats.visiblePen = visiblePen;
      stats.visibleHighlighter = visibleHighlighter;
    };

    const reconcile = (strokes = []) => {
      const started = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const active = new Set();
      let visiblePen = 0;
      let visibleHighlighter = 0;
      try {
        const nextStrokes = Array.isArray(strokes) ? strokes : [];
        lastStrokes = nextStrokes.slice();
        for (const stroke of nextStrokes) {
          const rendered = renderStroke(stroke);
          if (!rendered.visible) continue;
          active.add(rendered.key);
          const layerName = nodeLayers.get(rendered.key);
          layerName === "highlighter" ? visibleHighlighter++ : visiblePen++;
        }
        for (const key of [...nodes.keys()]) {
          if (!active.has(key)) removeNode(key);
        }
        stats.visiblePen = visiblePen;
        stats.visibleHighlighter = visibleHighlighter;
        stats.reconciliations++;
        stats.lastError = null;
      } catch (error) {
        stats.lastError = String(error);
        throw error;
      } finally {
        const ended = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        stats.lastMs = Math.max(0, ended - started);
      }
    };

    const upsertCommitted = strokes => {
      const started = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const nextStrokes = Array.isArray(strokes) ? strokes.filter(Boolean) : [strokes].filter(Boolean);
      try {
        for (const stroke of nextStrokes) {
          const key = strokeKey(stroke);
          const previousIndex = lastStrokes.findIndex(item => strokeKey(item) === key);
          if (previousIndex >= 0) lastStrokes[previousIndex] = stroke;
          else lastStrokes.push(stroke);
          const rendered = renderStroke(stroke);
          if (!rendered.visible) continue;
          const oppositeKey = `${rendered.key.startsWith("highlighter:") ? "pen" : "highlighter"}:${text(stroke.id)}`;
          if (oppositeKey !== rendered.key && nodes.has(oppositeKey)) removeKey(oppositeKey);
        }
        refreshVisibleCounts();
        stats.incrementalUpserts += nextStrokes.length;
        stats.lastError = null;
      } catch (error) {
        stats.lastError = String(error);
        throw error;
      } finally {
        const ended = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        stats.lastIncrementalMs = Math.max(0, ended - started);
      }
    };

    const clear = () => {
      for (const key of [...nodes.keys()]) removeKey(key);
      for (const layer of Object.values(layers)) while (layer.firstChild) layer.removeChild(layer.firstChild);
      stats.visiblePen = 0;
      stats.visibleHighlighter = 0;
      lastStrokes = [];
      nodeLayers.clear();
    };

    const setMode = next => {
      mode = VALID_MODES.has(next) ? next : "svg";
      setLayerVisibility();
    };

    const report = () => ({
      mode,
      visiblePen: stats.visiblePen,
      visibleHighlighter: stats.visibleHighlighter,
      pathCount: nodes.size,
      geometryCacheEntries: geometryCache.size,
      geometryCacheLimit: GEOMETRY_CACHE_LIMIT,
      geometryEvictions: stats.geometryEvictions,
      reconciliations: stats.reconciliations,
      pathsCreated: stats.pathsCreated,
      geometryHits: stats.geometryHits,
      geometryMisses: stats.geometryMisses,
      lastMs: stats.lastMs,
      lastIncrementalMs: stats.lastIncrementalMs,
      incrementalUpserts: stats.incrementalUpserts,
      attributeWrites: stats.attributeWrites,
      viewport,
      lastError: stats.lastError,
    });

    const dispose = () => {
      clear();
      pen.remove?.();
      highlighter.remove?.();
      nodes.clear();
      geometryCache.clear();
      lastStrokes = [];
      viewport = null;
    };

    setLayerVisibility();
    return {
      pen,
      highlighter,
      setMode,
      getMode: () => mode,
      setViewport,
      getViewportViewBox,
      reconcile,
      upsertCommitted,
      clear,
      dispose,
      report,
    };
  };

  return { SVG_NS, create };
})();
