/*
 * Incremental SVG presentation for the currently active fountain stroke.
 *
 * This helper owns only transient SVG path nodes and the canvas handoff. The
 * editor still owns the fountain state, persistence, gestures, and settled
 * SVG layer. It deliberately batches appends to one animation frame so raw
 * Pencil events never force a full SVG reconciliation.
 */
var HandwritingActiveSvgStroke = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const create = options => {
    const doc = options?.document;
    const windowRef = options?.window;
    let layer = null;
    let paths = [];
    let ribbonCount = 0;
    let frame = 0;
    let active = false;
    let canvasHidden = false;

    const cancelFrame = () => {
      if (frame === 0) return;
      windowRef?.cancelAnimationFrame?.(frame);
      frame = 0;
    };

    const restoreCanvas = () => {
      if (!canvasHidden) return;
      options.restoreCanvas?.();
      canvasHidden = false;
    };

    const clear = () => {
      cancelFrame();
      for (const path of paths) path.remove?.();
      paths = [];
      ribbonCount = 0;
      layer = null;
      active = false;
      restoreCanvas();
    };

    const appendRibbon = ribbon => {
      if (!layer || !Array.isArray(ribbon) || ribbon.length === 0) return false;
      let d = "";
      try {
        d = String(options.pathFromRibbon?.(ribbon) ?? "").trim();
      } catch {
        return false;
      }
      if (d === "") return false;
      const path = doc?.createElementNS?.(SVG_NS, "path");
      if (!path) return false;
      path.setAttribute?.("fill-rule", "nonzero");
      path.setAttribute?.("d", d);
      const style = options.getStyle?.() ?? {};
      path.setAttribute?.("fill", style.color ?? "#2f6de0");
      if (path.style) path.style.pointerEvents = "none";
      layer.appendChild?.(path);
      paths.push(path);
      return true;
    };

    const flush = () => {
      if (!active) return false;
      const state = options.getState?.();
      const ribbon = state?.ribbon;
      if (!Array.isArray(ribbon) || ribbon.length === 0) return false;
      if (ribbon.length < ribbonCount) {
        clear();
        return false;
      }
      if (ribbon.length === ribbonCount) return false;
      const start = Math.max(0, ribbonCount - 1);
      if (!appendRibbon(ribbon.slice(start))) return false;
      ribbonCount = ribbon.length;
      if (!canvasHidden) {
        options.hideCanvas?.();
        canvasHidden = true;
      }
      return true;
    };

    const start = () => {
      clear();
      if (!options.isEligible?.()) return false;
      const nextLayer = options.getLayer?.();
      if (!nextLayer || typeof nextLayer.appendChild !== "function") return false;
      layer = nextLayer;
      active = true;
      if (!flush()) {
        clear();
        return false;
      }
      return true;
    };

    const schedule = () => {
      if (!active || frame !== 0) return;
      const request = windowRef?.requestAnimationFrame;
      if (typeof request !== "function") {
        flush();
        return;
      }
      frame = request.call(windowRef, () => {
        frame = 0;
        flush();
      });
    };

    return {
      start,
      schedule,
      flush,
      clear,
      dispose: clear,
      report: () => ({
        active,
        pathCount: paths.length,
        ribbonCount,
        framePending: frame !== 0,
        canvasHidden,
      }),
    };
  };

  return { create };
})();
