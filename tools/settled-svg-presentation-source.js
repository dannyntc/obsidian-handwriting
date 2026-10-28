/*
 * Moves the existing completed SVG layers out of a transformed editor host
 * while the note is idle. The layers are never cloned, so their keyed path
 * nodes and geometry cache remain owned by HandwritingCommittedSvg.
 */
var HandwritingSettledSvgPresentation = (() => {
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

  const element = node => node?.nodeType === 1 ? node : null;

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

  const create = options => {
    const doc = options?.document ?? options?.layers?.pen?.ownerDocument;
    const layers = [options?.layers?.highlighter, options?.layers?.pen].filter(Boolean);
    const presentationRoot = options?.presentationRoot ?? options?.externalParent;
    if (!doc || !element(presentationRoot) || layers.length === 0) {
      throw new Error("HandwritingSettledSvgPresentation requires a document, element root, and SVG layers");
    }

    const host = doc.createElement("div");
    const windowRef = options?.window ?? doc.defaultView;
    const rootStyle = presentationRoot.style;
    const rootComputedStyle = windowRef?.getComputedStyle?.(presentationRoot) ?? {};
    const savedRootPosition = rootStyle?.position ?? "";
    const savedRootIsolation = rootStyle?.isolation ?? "";
    const rootPositionPatched = rootComputedStyle.position === "static";
    const rootIsolationPatched = rootComputedStyle.isolation !== "isolate";
    if (rootPositionPatched) setStyle(presentationRoot, "position", "relative");
    if (rootIsolationPatched) setStyle(presentationRoot, "isolation", "isolate");
    host.className = "handwriting-settled-svg-host";
    host.setAttribute?.("aria-hidden", "true");
    setStyle(host, "position", "absolute");
    setStyle(host, "pointerEvents", "none");
    setStyle(host, "overflow", "hidden");
    setStyle(host, "zIndex", "1");
    setStyle(host, "display", "none");
    presentationRoot.appendChild(host);

    const saved = new Map();
    let presentationMode = "editor";
    let disposed = false;
    let lastExternalRect = null;
    let lastPresentationRootRect = null;
    let lastHostLocalRect = null;
    let lastViewBox = null;
    let lastReason = "initial";

    const ancestorTransforms = () => {
      const transforms = [];
      for (let node = host; element(node); node = node.parentElement) {
        const transform = windowRef?.getComputedStyle?.(node)?.transform;
        if (transform && transform !== "none") transforms.push(transform);
      }
      return transforms;
    };

    const saveLayer = layer => {
      if (saved.has(layer)) return;
      saved.set(layer, {
        parent: layer.parentNode,
        nextSibling: layer.nextSibling ?? null,
        viewBox: layer.getAttribute?.("viewBox"),
        width: layer.getAttribute?.("width"),
        height: layer.getAttribute?.("height"),
      });
    };

    const restoreLayer = (layer, record) => {
      if (record.parent) {
        const next = record.nextSibling && record.nextSibling.parentNode === record.parent
          ? record.nextSibling
          : null;
        record.parent.insertBefore(layer, next);
      }
      if (record.viewBox === null || record.viewBox === undefined) layer.removeAttribute?.("viewBox");
      else layer.setAttribute("viewBox", record.viewBox);
      if (record.width === null || record.width === undefined) layer.removeAttribute?.("width");
      else layer.setAttribute("width", record.width);
      if (record.height === null || record.height === undefined) layer.removeAttribute?.("height");
      else layer.setAttribute("height", record.height);
    };

    const exit = reason => {
      if (presentationMode !== "external") return false;
      for (const layer of layers) {
        const record = saved.get(layer);
        if (record) restoreLayer(layer, record);
      }
      setStyle(host, "display", "none");
      presentationMode = "editor";
      lastReason = reason ?? "restore-editor";
      lastExternalRect = null;
      lastPresentationRootRect = null;
      lastHostLocalRect = null;
      lastViewBox = null;
      saved.clear();
      return true;
    };

    const enter = input => {
      if (disposed) return false;
      if (presentationMode === "external") exit("refresh-external");
      const source = rect(input?.sourceRect);
      const clipSource = input?.clipRect ?? options.clip?.(source);
      const rootRect = rect(input?.presentationRootRect ?? presentationRoot.getBoundingClientRect?.());
      const clip = intersect(intersect(source, clipSource), rootRect);
      if (!source || !clip) {
        lastReason = "invalid-rect";
        return false;
      }
      const hostLocalRect = localRect(clip, rootRect, presentationRoot);
      if (!hostLocalRect) {
        lastReason = "invalid-root-rect";
        return false;
      }

      const layerViewBoxes = layers.map(layer => computeViewBox(
        source,
        clip,
        layer.getAttribute?.("viewBox"),
      ));
      if (layerViewBoxes.some(value => !value)) {
        lastReason = "invalid-viewbox";
        return false;
      }

      for (const layer of layers) saveLayer(layer);
      setStyle(host, "left", `${hostLocalRect.left}px`);
      setStyle(host, "top", `${hostLocalRect.top}px`);
      setStyle(host, "width", `${hostLocalRect.width}px`);
      setStyle(host, "height", `${hostLocalRect.height}px`);
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index];
        layer.setAttribute("viewBox", layerViewBoxes[index]);
        layer.setAttribute("width", String(clip.width));
        layer.setAttribute("height", String(clip.height));
        host.appendChild(layer);
      }
      setStyle(host, "display", "block");
      presentationMode = "external";
      lastExternalRect = clip;
      lastPresentationRootRect = rootRect;
      lastHostLocalRect = hostLocalRect;
      lastViewBox = layerViewBoxes[1] ?? layerViewBoxes[0];
      lastReason = "external";
      return true;
    };

    const dispose = () => {
      if (disposed) return;
      exit("dispose");
      host.remove?.();
      if (rootPositionPatched) setStyle(presentationRoot, "position", savedRootPosition);
      if (rootIsolationPatched) setStyle(presentationRoot, "isolation", savedRootIsolation);
      saved.clear();
      disposed = true;
    };

    return {
      host,
      enter,
      exit,
      dispose,
      mode: () => presentationMode,
      report: () => ({
        mode: presentationMode,
        rect: lastExternalRect,
        presentationRootRect: lastPresentationRootRect,
        hostLocalRect: lastHostLocalRect,
        viewBox: lastViewBox,
        reason: lastReason,
        hostRect: host.getBoundingClientRect?.() ?? null,
        ancestorTransforms: ancestorTransforms(),
      }),
    };
  };

  return { computeViewBox, create };
})();
