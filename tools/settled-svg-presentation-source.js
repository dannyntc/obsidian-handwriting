/*
 * Owns one permanent, note-local host for completed SVG ink.
 *
 * The host is created beside the scaled Markdown editor, not inside it. SVG
 * layers are attached once and stay there; updates only change the host
 * rectangle and the cropped viewBox. Wet ink, hit testing, and stroke data
 * remain owned by the controller and HandwritingCommittedSvg.
 */
var HandwritingSettledSvgPresentation = (() => {
  const rootRecords = new WeakMap();

  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

  const rect = value => {
    if (!value) return null;
    const left = finite(value.left, NaN);
    const top = finite(value.top, NaN);
    const width = finite(value.width, NaN);
    const height = finite(value.height, NaN);
    return [left, top, width, height].every(Number.isFinite) && width > 0 && height > 0
      ? { left, top, width, height }
      : null;
  };

  const viewBoxParts = value => {
    const parts = String(value ?? "").trim().split(/[\s,]+/).map(Number);
    return parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0
      ? parts
      : null;
  };

  const intersect = (first, second) => {
    const a = rect(first);
    const b = rect(second);
    if (!a || !b) return null;
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.left + a.width, b.left + b.width);
    const bottom = Math.min(a.top + a.height, b.top + b.height);
    return right > left && bottom > top
      ? { left, top, width: right - left, height: bottom - top }
      : null;
  };

  const computeViewBox = (sourceRect, clipRect, originalViewBox) => {
    const source = rect(sourceRect);
    const clip = rect(clipRect);
    const viewBox = viewBoxParts(originalViewBox);
    if (!source || !clip || !viewBox) return null;
    const [x, y, width, height] = viewBox;
    const sx = width / source.width;
    const sy = height / source.height;
    const next = [
      x + (clip.left - source.left) * sx,
      y + (clip.top - source.top) * sy,
      clip.width * sx,
      clip.height * sy,
    ];
    return next.every(Number.isFinite) && next[2] > 0 && next[3] > 0 ? next.join(" ") : null;
  };

  const setStyle = (node, property, value) => {
    if (node?.style) node.style[property] = value;
  };

  const sameRect = (first, second) => !!first && !!second
    && first.left === second.left
    && first.top === second.top
    && first.width === second.width
    && first.height === second.height;

  const setStyleIfChanged = (node, property, value) => {
    if (!node?.style || node.style[property] === value) return false;
    node.style[property] = value;
    return true;
  };

  const element = node => node?.nodeType === 1 ? node : null;

  const contains = (root, node) => {
    if (!root || !node) return false;
    if (typeof root.contains === "function") return root.contains(node);
    for (let current = node; current; current = current.parentElement) {
      if (current === root) return true;
    }
    return false;
  };

  const localRect = (viewportRect, rootRect, root) => {
    const viewport = rect(viewportRect);
    const rootBounds = rect(rootRect);
    if (!viewport || !rootBounds) return null;
    const scrollLeft = finite(root?.scrollLeft, 0);
    const scrollTop = finite(root?.scrollTop, 0);
    const clientLeft = finite(root?.clientLeft, 0);
    const clientTop = finite(root?.clientTop, 0);
    return {
      left: viewport.left - rootBounds.left + scrollLeft - clientLeft,
      top: viewport.top - rootBounds.top + scrollTop - clientTop,
      width: viewport.width,
      height: viewport.height,
    };
  };

  const rootTransforms = (root, windowRef) => {
    const transforms = [];
    for (let node = root; element(node); node = node.parentElement) {
      const transform = windowRef?.getComputedStyle?.(node)?.transform;
      if (transform && transform !== "none") transforms.push(transform);
    }
    return transforms;
  };

  const acquireRoot = (root, windowRef) => {
    const existing = rootRecords.get(root);
    if (existing) {
      existing.count++;
      return existing;
    }

    const style = root.style ?? {};
    const computed = windowRef?.getComputedStyle?.(root) ?? {};
    const saved = {
      position: style.position ?? "",
      isolation: style.isolation ?? "",
    };
    const positionPatched = computed.position === "static";
    const isolationPatched = computed.isolation !== "isolate";
    if (positionPatched) setStyle(root, "position", "relative");
    if (isolationPatched) setStyle(root, "isolation", "isolate");

    const record = { count: 1, saved, positionPatched, isolationPatched };
    rootRecords.set(root, record);
    return record;
  };

  const releaseRoot = (root, record) => {
    if (!record || record.count <= 0) return;
    record.count--;
    if (record.count > 0) return;
    if (record.positionPatched && (root.style?.position ?? "") === "relative") {
      setStyle(root, "position", record.saved.position);
    }
    if (record.isolationPatched && (root.style?.isolation ?? "") === "isolate") {
      setStyle(root, "isolation", record.saved.isolation);
    }
    rootRecords.delete(root);
  };

  const create = options => {
    const doc = options?.document ?? options?.presentationRoot?.ownerDocument;
    const presentationRoot = options?.presentationRoot;
    const editor = options?.editor;
    const scrollElement = options?.scrollElement;
    const windowRef = options?.window ?? doc?.defaultView;
    if (!doc || !element(presentationRoot) || presentationRoot.ownerDocument !== doc) {
      throw new Error("HandwritingSettledSvgPresentation requires a note-root element and owner document");
    }
    if (presentationRoot.isConnected === false || editor && (!element(editor) || editor.ownerDocument !== doc || !contains(presentationRoot, editor)) || scrollElement && (!element(scrollElement) || scrollElement.ownerDocument !== doc || !contains(presentationRoot, scrollElement))) {
      throw new Error("HandwritingSettledSvgPresentation requires an editor contained by the note root");
    }

    const rootRecord = acquireRoot(presentationRoot, windowRef);
    const host = doc.createElement("div");
    host.className = "handwriting-settled-svg-host";
    host.setAttribute?.("aria-hidden", "true");
    setStyle(host, "position", "absolute");
    setStyle(host, "pointerEvents", "none");
    setStyle(host, "overflow", "hidden");
    setStyle(host, "contain", "layout paint");
    setStyle(host, "zIndex", "1");
    setStyle(host, "display", "none");
    presentationRoot.appendChild(host);

    let layers = [];
    let disposed = false;
    let visible = false;
    let lastRect = null;
    let lastRootRect = null;
    let lastHostLocalRect = null;
    let lastViewBox = null;
    let lastReason = "initial";
    let generation = 0;
    let updateCount = 0;
    let hideCount = 0;

    const setHidden = reason => {
      setStyle(host, "display", "none");
      visible = false;
      lastReason = reason ?? "hidden";
      hideCount++;
    };

    const attach = nextLayers => {
      if (disposed) return false;
      const next = [nextLayers?.highlighter, nextLayers?.pen].filter(Boolean);
      if (next.length === 0 || next.some(layer => !element(layer) || layer.ownerDocument !== doc)) {
        lastReason = "invalid-layers";
        return false;
      }
      if (layers.length > 0 && next.some((layer, index) => layer !== layers[index])) {
        lastReason = "layer-set-changed";
        return false;
      }
      for (const layer of next) {
        if (layer.parentNode !== host) host.appendChild(layer);
      }
      layers = next;
      return true;
    };

    const update = input => {
      if (disposed) return false;
      if (layers.length === 0) {
        setHidden("layers-not-attached");
        return false;
      }
      const transforms = rootTransforms(presentationRoot, windowRef);
      if (transforms.length > 0) {
        setHidden("unsupported-root-transform");
        return false;
      }
      const source = rect(input?.sourceRect);
      const rootRect = rect(input?.presentationRootRect ?? presentationRoot.getBoundingClientRect?.());
      let clip = rect(input?.clipRect ?? options?.clip?.() ?? scrollElement?.getBoundingClientRect?.());
      const clipRects = Array.isArray(input?.clipRects) ? input.clipRects : [];
      for (const nextClip of clipRects) clip = clip ? intersect(clip, nextClip) : rect(nextClip);
      clip = clip ? intersect(clip, rootRect) : null;
      if (!source || !rootRect || !clip) {
        setHidden("invalid-rect");
        return false;
      }
      const hostLocalRect = localRect(clip, rootRect, presentationRoot);
      if (!hostLocalRect) {
        setHidden("invalid-root-rect");
        return false;
      }

      const suppliedViewBoxes = input?.viewBoxes ?? {};
      const viewBoxes = layers.map((layer, index) => {
        const name = index === 0 ? "highlighter" : "pen";
        return suppliedViewBoxes[name] ?? input?.viewBox ?? layer.getAttribute?.("viewBox");
      });
      const cropped = viewBoxes.map(value => computeViewBox(source, clip, value));
      if (cropped.some(value => !value)) {
        setHidden("invalid-viewbox");
        return false;
      }

      const nextHostStyles = {
        left: `${hostLocalRect.left}px`,
        top: `${hostLocalRect.top}px`,
        width: `${hostLocalRect.width}px`,
        height: `${hostLocalRect.height}px`,
      };
      const unchanged = visible
        && sameRect(lastRect, clip)
        && sameRect(lastRootRect, rootRect)
        && sameRect(lastHostLocalRect, hostLocalRect)
        && layers.every((layer, index) => layer.getAttribute?.("viewBox") === cropped[index]
          && layer.getAttribute?.("width") === String(clip.width)
          && layer.getAttribute?.("height") === String(clip.height))
        && Object.entries(nextHostStyles).every(([property, value]) => host.style?.[property] === value);
      if (unchanged) {
        lastReason = "unchanged";
        return true;
      }
      for (const [property, value] of Object.entries(nextHostStyles)) {
        setStyleIfChanged(host, property, value);
      }
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index];
        const nextViewBox = cropped[index];
        const nextWidth = String(clip.width);
        const nextHeight = String(clip.height);
        if (layer.getAttribute?.("viewBox") !== nextViewBox) layer.setAttribute("viewBox", nextViewBox);
        if (layer.getAttribute?.("width") !== nextWidth) layer.setAttribute("width", nextWidth);
        if (layer.getAttribute?.("height") !== nextHeight) layer.setAttribute("height", nextHeight);
      }
      setStyleIfChanged(host, "display", "block");
      visible = true;
      updateCount++;
      generation++;
      lastRect = clip;
      lastRootRect = rootRect;
      lastHostLocalRect = hostLocalRect;
      lastViewBox = cropped[1] ?? cropped[0];
      lastReason = "updated";
      return true;
    };

    const hide = reason => {
      if (disposed) return false;
      const wasVisible = visible;
      setHidden(reason);
      return wasVisible;
    };

    const dispose = () => {
      if (disposed) return;
      setHidden("dispose");
      host.remove?.();
      releaseRoot(presentationRoot, rootRecord);
      disposed = true;
    };

    return {
      host,
      layerRoot: host,
      attach,
      update,
      hide,
      dispose,
      getGeneration: () => generation,
      getLastReason: () => lastReason,
      mode: () => visible ? "permanent" : "hidden",
      report: () => ({
        mode: visible ? "permanent" : "hidden",
        visible,
        rect: lastRect,
        presentationRootRect: lastRootRect,
        hostLocalRect: lastHostLocalRect,
        viewBox: lastViewBox,
        reason: lastReason,
        generation,
        updateCount,
        hideCount,
        hostRect: host.getBoundingClientRect?.() ?? null,
        ancestorTransforms: rootTransforms(presentationRoot, windowRef),
        layerParents: layers.map(layer => layer.parentNode === host),
      }),
    };
  };

  return { computeViewBox, create };
})();
