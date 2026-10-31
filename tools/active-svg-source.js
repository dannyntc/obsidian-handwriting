/*
 * Canonical live SVG presentation for the currently active fountain stroke.
 *
 * The editor still owns fountain state, persistence, gestures, and the
 * settled SVG layer. This helper owns one transient path and the canvas
 * handoff. Every frame serializes the same whole-stroke outline that the
 * completed renderer will use, so lifting the Pencil does not replace a
 * collection of differently capped chunks with a different shape.
 */
var HandwritingActiveSvgStroke = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const create = options => {
    const doc = options?.document;
    const windowRef = options?.window;
    let layer = null;
    let path = null;
    let frame = 0;
    let active = false;
    let adopted = false;
    let canvasHidden = false;
    let canvasVisibilityToken = null;
    let lastRevision = null;
    let lastD = "";

    const cancelFrame = () => {
      if (frame === 0) return;
      windowRef?.cancelAnimationFrame?.(frame);
      frame = 0;
    };

    const restoreCanvas = () => {
      if (!canvasHidden) return;
      options.restoreCanvas?.(canvasVisibilityToken);
      canvasVisibilityToken = null;
      canvasHidden = false;
    };

    const stateRevision = state => {
      const raw = Array.isArray(state?.raw) ? state.raw : [];
      const ribbon = Array.isArray(state?.ribbon) ? state.ribbon : [];
      const last = raw[raw.length - 1] ?? {};
      return [
        raw.length,
        ribbon.length,
        last.x, last.y, last.pressure, last.t,
        state?.pressure,
        state?.lastHalfWidth,
        options.getPreviewRevision?.(),
      ].map(value => String(value ?? "")).join("|");
    };

    const createPath = () => {
      if (!layer || typeof doc?.createElementNS !== "function") return null;
      const next = doc.createElementNS(SVG_NS, "path");
      if (!next) return null;
      next.setAttribute?.("fill-rule", "nonzero");
      if (next.style) next.style.pointerEvents = "none";
      layer.appendChild?.(next);
      path = next;
      return next;
    };

    const updatePath = d => {
      if (!layer || typeof d !== "string" || d.trim() === "") return false;
      const next = path ?? createPath();
      if (!next) return false;
      if (next.getAttribute?.("d") !== d) next.setAttribute?.("d", d);
      const style = options.getStyle?.() ?? {};
      const color = style.color ?? "#2f6de0";
      if (next.getAttribute?.("fill") !== color) next.setAttribute?.("fill", color);
      lastD = d;
      return true;
    };

    const pathForState = state => {
      let d = "";
      try {
        const previewStroke = options.getPreviewStroke?.();
        if (previewStroke?.points?.length && typeof options.pathFromStroke === "function") {
          d = String(options.pathFromStroke(previewStroke) ?? "").trim();
        }
        if (d === "") d = String(options.pathFromState?.(state) ?? "").trim();
        if (d === "") d = String(options.pathFromRibbon?.(state?.ribbon) ?? "").trim();
      } catch {
        d = "";
      }
      return d;
    };

    const flush = () => {
      if (!active) return false;
      const state = options.getState?.();
      const ribbon = state?.ribbon;
      if (!Array.isArray(ribbon) || ribbon.length === 0) return false;
      const revision = stateRevision(state);
      if (revision === lastRevision && path) return false;
      const d = pathForState(state);
      if (d === "" || !updatePath(d)) return false;
      lastRevision = revision;
      if (!canvasHidden) {
        canvasVisibilityToken = options.hideCanvas?.() ?? null;
        canvasHidden = true;
      }
      return true;
    };

    const clear = () => {
      cancelFrame();
      if (path && !adopted) path.remove?.();
      path = null;
      layer = null;
      active = false;
      adopted = false;
      lastRevision = null;
      lastD = "";
      restoreCanvas();
    };

    const complete = stroke => {
      if (!active || !layer || !path) return false;
      cancelFrame();
      let d = "";
      try {
        d = String(options.pathFromStroke?.(stroke) ?? "").trim();
      } catch {
        d = "";
      }
      if (d === "") d = lastD || pathForState(options.getState?.());
      if (d === "" || !updatePath(d)) return false;

      let transferred = false;
      if (stroke && typeof options.adoptPath === "function") {
        try {
          transferred = options.adoptPath(stroke, path, d) === true;
        } catch {
          transferred = false;
        }
      }
      adopted = transferred;
      active = false;
      lastRevision = null;
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
      complete,
      clear,
      dispose: clear,
      report: () => ({
        active,
        pathCount: path && path.parentNode ? 1 : 0,
        framePending: frame !== 0,
        canvasHidden,
        adopted,
      }),
    };
  };

  return { create };
})();
