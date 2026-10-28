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
  const VALID_MODES = new Set(["svg", "canvas"]);

  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const text = value => String(value ?? "");
  const layerFor = stroke => stroke?.tool === "highlighter" ? "highlighter" : "pen";
  const strokeKey = stroke => `${layerFor(stroke)}:${text(stroke?.id)}`;

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
    const geometryCache = new Map();
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
      lastError: null,
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
      viewport = {
        x, y, width, height, zoom,
        viewWidth, viewHeight,
        overscan: Math.max(0, finite(next?.overscan, DEFAULT_OVERSCAN)),
      };
      const viewBox = `${x} ${y} ${viewWidth} ${viewHeight}`;
      for (const layer of Object.values(layers)) {
        layer.setAttribute("viewBox", viewBox);
        layer.setAttribute("width", String(width));
        layer.setAttribute("height", String(height));
      }
    };

    const visible = stroke => {
      if (!viewport || !stroke?.bbox) return true;
      const box = stroke.bbox;
      const margin = viewport.overscan / viewport.zoom;
      const left = viewport.x - margin;
      const top = viewport.y - margin;
      const right = viewport.x + viewport.viewWidth + margin;
      const bottom = viewport.y + viewport.viewHeight + margin;
      return Number.isFinite(box.x) && Number.isFinite(box.y)
        && Number.isFinite(box.width) && Number.isFinite(box.height)
        && box.x <= right && box.y <= bottom
        && box.x + box.width >= left && box.y + box.height >= top;
    };

    const removeKey = key => {
      const node = nodes.get(key);
      if (node) node.remove?.();
      nodes.delete(key);
      geometryCache.delete(key);
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
          if (!stroke || !visible(stroke)) continue;
          const key = strokeKey(stroke);
          const layerName = layerFor(stroke);
          const layer = layers[layerName];
          const revision = options.revision ? options.revision(stroke) : fallbackRevision(stroke);
          let record = geometryCache.get(key);
          if (!record || record.revision !== revision) {
            const d = options.path?.(stroke);
            if (typeof d !== "string" || d.trim() === "") {
              removeKey(key);
              continue;
            }
            record = { revision, d };
            geometryCache.set(key, record);
            stats.geometryMisses++;
          } else {
            stats.geometryHits++;
          }
          let node = nodes.get(key);
          if (!node) {
            node = doc.createElementNS(SVG_NS, "path");
            node.setAttribute("fill-rule", "nonzero");
            setStyle(node, "pointerEvents", "none");
            nodes.set(key, node);
            stats.pathsCreated++;
          }
          node.setAttribute("d", record.d);
          node.setAttribute("fill", text(options.color?.(stroke) ?? stroke.color ?? "#000000"));
          layer.appendChild(node);
          active.add(key);
          layerName === "highlighter" ? visibleHighlighter++ : visiblePen++;
        }
        for (const key of [...nodes.keys()]) {
          if (!active.has(key)) removeKey(key);
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

    const upsertCommitted = stroke => {
      const key = strokeKey(stroke);
      const next = lastStrokes.filter(item => strokeKey(item) !== key);
      next.push(stroke);
      reconcile(next);
    };

    const clear = () => {
      for (const key of [...nodes.keys()]) removeKey(key);
      for (const layer of Object.values(layers)) while (layer.firstChild) layer.removeChild(layer.firstChild);
      stats.visiblePen = 0;
      stats.visibleHighlighter = 0;
      lastStrokes = [];
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
      reconciliations: stats.reconciliations,
      pathsCreated: stats.pathsCreated,
      geometryHits: stats.geometryHits,
      geometryMisses: stats.geometryMisses,
      lastMs: stats.lastMs,
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
      setViewport,
      reconcile,
      upsertCommitted,
      clear,
      dispose,
      report,
    };
  };

  return { SVG_NS, create };
})();
