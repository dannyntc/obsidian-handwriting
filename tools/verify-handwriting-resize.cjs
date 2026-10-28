const fs = require("node:fs");
const vm = require("node:vm");

const main = fs.readFileSync("main.js", "utf8");
const classStart = main.indexOf("var Ep=class");
const methodStart = main.indexOf("handleResize(){", classStart);
const methodEnd = main.indexOf("allocateHighlightPair(){", methodStart);

if (classStart < 0 || methodStart < 0 || methodEnd < 0) {
  throw new Error("could not locate InlineHandwritingController.handleResize");
}

const methodSource = main.slice(methodStart, methodEnd).trim();
const context = {
  W: { Platform: { isMobileApp: true } },
  Se: 100000,
  mn: 1.5,
  f0: 2,
  ot: 0.001,
  Fs: 1,
  Lo: value => value > 0 ? value : 1,
  wh: () => 1,
  xh: () => 1,
  yh: (_dpr, scale) => scale * 2,
  Yn: (width, height, backing) => ({
    backingW: Math.round(width * backing),
    backingH: Math.round(height * backing),
    cssW: width,
    cssH: height,
  }),
  Un: (width, height) => ({ width, height, transform: "" }),
  I: { setFontRefPx() {} },
  Zl: 0,
  Number,
  Math,
};

vm.runInNewContext(
  `this.resize = function ${methodSource};`,
  context,
  { filename: "main.js:handleResize" },
);

const calls = [];
const canvas = () => ({
  width: 0,
  height: 0,
  setCssStyles(styles) { this.styles = styles; },
});
const makeController = () => {
  const controller = {
    deferPinchRaster: () => false,
    restorePinchLayers() {},
    mobileTools: null,
    noteZoomControls: null,
    scrollExpansion: null,
    viewportLayout: null,
    viewportStyleDirty: null,
    resizeDeferred: false,
    frame: { locked: false },
    pinchPreview: false,
    clearSnapPreview() {},
    canvasMode: false,
    syncBand() { calls.push("syncBand"); },
    scale: 1,
    dpr: 2,
    winRef: {
      devicePixelRatio: 2,
      getComputedStyle: () => ({ fontSize: "16px" }),
    },
    view: {
      scaleX: 1,
      state: null,
      contentDOM: {},
      scrollDOM: { scrollLeft: 0, scrollTop: 0 },
    },
    contentStyle: null,
    lastFontStr: "",
    refFontPx: 16,
    cssScale: 1,
    pinchScaleNow: 1,
    fontZoom: 1,
    scaleGeometryValid: true,
    updatePaperSpacing() {},
    retryCanvasOffReset: () => false,
    container: {
      offsetWidth: 1024,
      offsetHeight: 768,
      getBoundingClientRect: () => ({ width: 1024, height: 768 }),
    },
    committedCanvas: canvas(),
    wetCanvas: canvas(),
    highlightCanvas: canvas(),
    highlightWetCanvas: canvas(),
    highlightPairDeferred: false,
    wetDeferred: false,
    standIn: null,
    takeStandIn() {},
    zoomFormAt: () => false,
    backingBoxMismatch: null,
    committedCtx: { setTransform() {} },
    highlightCtx: { setTransform() {} },
    wet: {
      applyDpr() {},
      noteBackingCleared() {},
      dropWetTile() {},
      tileTranslate: false,
    },
    highlightWet: {
      applyDpr() {},
      noteBackingCleared() {},
    },
    tail: {
      applyDpr() {},
      noteBackingCleared() {},
      configureInlineBacking() {},
    },
    wetTileCanvas: null,
    translateSupported: () => false,
    committedBlank: false,
    highlightBlank: false,
    router: { refreshRect() {} },
    axisChecked: true,
    damage: { addAll() {} },
    indexDirty: false,
    lastPaintCam: {},
    builder: {},
    mode: "ink",
    repaint() { calls.push("repaint"); },
    scheduleRepaint(reason) { calls.push(`schedule:${reason}`); },
    columnLeft: () => 0,
    lastSyncContentLeft: 0,
    syncCamera() {},
    filePath: () => null,
  };
  return controller;
};

const controller = makeController();
context.resize.call(controller);

if (controller.committedCanvas.width !== 3072 || controller.committedCanvas.height !== 2304) {
  throw new Error(`unexpected backing allocation: ${controller.committedCanvas.width}x${controller.committedCanvas.height}`);
}
if (controller.rasterTarget !== 3 || controller.rasterAllocated !== 3) {
  throw new Error(`unexpected raster metrics: ${controller.rasterTarget}/${controller.rasterAllocated}`);
}
if (Object.prototype.hasOwnProperty.call(context, "p")) {
  throw new Error("resize leaked the comparison variable into global scope");
}

const callsAfterInitialResize = calls.filter(call => call === "repaint" || call.startsWith("schedule:")).length;
context.resize.call(controller);
const callsAfterUnchangedResize = calls.filter(call => call === "repaint" || call.startsWith("schedule:")).length;
if (callsAfterUnchangedResize !== callsAfterInitialResize || controller.committedCanvas.width !== 3072) {
  throw new Error("unchanged resize should not repaint or reallocate");
}

const deferred = makeController();
deferred.deferPinchRaster = () => true;
const callsBeforeDeferred = calls.length;
context.resize.call(deferred);
if (deferred.committedCanvas.width !== 0 || calls.length !== callsBeforeDeferred) {
  throw new Error("deferred pinch resize should return before allocation");
}

console.log("PASS: handleResize executes and allocates without leaked globals");
