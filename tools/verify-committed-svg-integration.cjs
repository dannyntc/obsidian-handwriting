const fs = require("node:fs");
const vm = require("node:vm");

const main = fs.readFileSync("main.js", "utf8");
const source = fs.readFileSync("tools/committed-svg-source.js", "utf8").trim();
const settledSource = fs.readFileSync("tools/settled-svg-presentation-source.js", "utf8").trim();

const required = [
  "HandwritingCommittedSvg",
  "handwriting-committed-svg-pen",
  "handwriting-committed-svg-highlighter",
  "completedInkRenderer",
  "setMode(t)",
  "t.reconcile(e??this.committedSvgStrokes())",
  "upsertCommitted",
  "reconcileCommittedSvg(e,o={})",
  "this.reconcileCommittedSvg(r,{priority:!0})",
  "committedSvgLastGeneration",
  "lastSvgHandoffMs",
  "completedInkRenderer",
  "HandwritingSettledSvgPresentation",
  "handwriting-settled-svg-host",
  "settledSvgPresentation=null",
  "HandwritingSettledSvgPresentation.create",
  'presentationRoot:this.view.dom.closest(".markdown-source-view")',
  "layerRoot",
  "scrollElement:n",
  "t.update({sourceRect:r,clipRect:o,presentationRootRect:a,viewBox:l})",
  "applySettledSvgPresentation",
  "exitSettledSvgPresentation",
  "settledSvgPresentation?.dispose",
  'settledSvgPresentationMode="permanent"',
  "settledSvgPresentationFallbackNoticed",
  "svg-fallback",
  "committedSvgCoverage",
  "committedSvgCoverageContains",
  "settledSvgPresentationPending",
  "flushSettledSvgPresentation",
  "movementFrameSamples",
  "settledSvgPresentationMutations",
  "settledSvgGeometryCache",
  "settledSvgGeometry()",
  "getViewportViewBox",
];
const failures = required.filter(fragment => !main.includes(fragment));
if (failures.length) throw new Error(`committed SVG integration is missing: ${failures.join(", ")}`);
if (!main.includes(source)) throw new Error("committed SVG source is not injected verbatim");
if (!main.includes(settledSource)) throw new Error("settled SVG presentation source is not injected verbatim");
if (main.includes('externalParent:t.ownerDocument.body')) throw new Error("settled SVG presentation still mounts on document.body");
if (main.includes("settledSvgPresentationObserver")) throw new Error("settled SVG presentation still owns a resize observer loop");
if (main.includes("settledSvgPresentation.enter")) throw new Error("settled SVG presentation still reparents layers on settle");
if (main.includes('repaint(){this.exitSettledSvgPresentation("repaint")')) {
  throw new Error("ordinary repaint still hides the settled SVG host");
}
if (main.includes('this.exitSettledSvgPresentation("scroll")')) {
  throw new Error("ordinary scrolling still hides the settled SVG host");
}
if (main.includes('settledSvgPresentation:"editor"') || main.includes('settledSvgPresentation:e?.')) {
  throw new Error("legacy settled SVG setting is still active");
}
if (main.includes("j.settledSvgPresentation=") || main.includes("applySettledSvgPresentation?.")) {
  throw new Error("legacy settled SVG runtime setting is still active");
}
if (main.includes("Settled SVG presentation")) throw new Error("legacy settled SVG setting is still shown");
if (!main.includes("/* BEGIN HANDWRITING COMMITTED SVG */") || !main.includes("/* END HANDWRITING COMMITTED SVG */")) {
  throw new Error("committed SVG injection markers are missing");
}
if (!main.includes("/* BEGIN HANDWRITING SETTLED SVG PRESENTATION */") || !main.includes("/* END HANDWRITING SETTLED SVG PRESENTATION */")) {
  throw new Error("settled SVG presentation injection markers are missing");
}

const repaintAnchor = main.indexOf('scheduleRepaint(e="other")');
const repaintStart = repaintAnchor >= 0 ? main.indexOf("repaint(){", repaintAnchor) : -1;
const repaintEnd = repaintStart >= 0 ? main.indexOf("syncBand(){", repaintStart) : -1;
if (repaintStart < 0 || repaintEnd < 0) {
  throw new Error("note-editor repaint method could not be located");
}
const repaint = main.slice(repaintStart, repaintEnd);
const syncCameraAt = repaint.indexOf("this.syncCamera()");
const reconcileAt = repaint.indexOf("reconcileCommittedSvg");
const paintWorkAt = repaint.lastIndexOf("this.paintCommittedWork(");
if (syncCameraAt < 0 || paintWorkAt < 0 || syncCameraAt > paintWorkAt) {
  throw new Error("note repaint does not synchronize the camera before painting");
}
if (reconcileAt >= 0 && reconcileAt < syncCameraAt) {
  throw new Error("note repaint reconciles SVG before synchronizing the camera");
}
if (!repaint.includes("flushSettledSvgPresentation()")) {
  throw new Error("note repaint does not flush settled SVG presentation in its own frame");
}
const flushStart = main.indexOf("flushSettledSvgPresentation(){");
const flushEnd = flushStart >= 0 ? main.indexOf("handleResize()", flushStart) : -1;
if (flushStart < 0 || flushEnd < 0 || !main.slice(flushStart, flushEnd).includes("this.settledSvgGeometryCache=null")) {
  throw new Error("settled SVG presentation does not refresh geometry at the start of each frame");
}

const scheduleStart = main.indexOf('scheduleRepaint(e="other")');
const scheduleEnd = scheduleStart >= 0 ? main.indexOf("committedCtxFor(e)", scheduleStart) : -1;
if (scheduleStart < 0 || scheduleEnd < 0) throw new Error("repaint scheduler could not be located");
const scheduler = main.slice(scheduleStart, scheduleEnd);
if (scheduler.includes("scheduleSettledSvgPresentation(")) {
  throw new Error("repaint scheduler still queues a second settled SVG frame");
}
if (!scheduler.includes("this.repaintReason=e")) {
  throw new Error("repaint scheduler does not preserve the latest frame reason");
}

const svgRangeStart = main.indexOf("reconcileCommittedSvg(e,o={})");
const svgRangeEnd = svgRangeStart >= 0 ? main.indexOf("applySettledSvgPresentation(e)", svgRangeStart) : -1;
if (svgRangeStart < 0 || svgRangeEnd < 0) throw new Error("SVG reconciliation methods could not be located");
if (main.slice(svgRangeStart, svgRangeEnd).includes("updateSettledSvgPresentation(")) {
  throw new Error("SVG reconciliation still performs a separate presentation update");
}

const applyStart = main.indexOf("applyCompletedInkRenderer(e)");
const applyEnd = applyStart >= 0 ? main.indexOf("committedSvgStrokes(){", applyStart) : -1;
if (applyStart < 0 || applyEnd < 0) throw new Error("completed-ink renderer method could not be located");
const applyRenderer = main.slice(applyStart, applyEnd);
if (applyRenderer.includes("t===\"svg\"?(this.reconcileCommittedSvg()")) {
  throw new Error("switching to SVG still reconciles before the camera-synchronized repaint");
}
if (!applyRenderer.includes('this.scheduleRepaint(\"renderer\")')) {
  throw new Error("completed-ink renderer changes do not schedule a camera-synchronized repaint");
}

const loadStart = main.indexOf("loadInk(e)");
const loadEnd = loadStart >= 0 ? main.indexOf("adoptStoredFontRef(e){", loadStart) : -1;
if (loadStart < 0 || loadEnd < 0) throw new Error("note handwriting load method could not be located");
const loadInk = main.slice(loadStart, loadEnd);
if (!loadInk.includes("this.committedSvgLastPath=null") || !loadInk.includes("this.committedSvgLastGeneration=-1")) {
  throw new Error("successful handwriting load does not invalidate the SVG reconciliation cache");
}

const extractMethod = (startNeedle, endNeedle) => {
  const start = main.indexOf(startNeedle);
  const end = start >= 0 ? main.indexOf(endNeedle, start + startNeedle.length) : -1;
  if (start < 0 || end < 0) throw new Error(`could not extract ${startNeedle}`);
  return main.slice(start, end);
};

const pinchStart = main.indexOf("pinch(e,t,n)");
const pinchEnd = pinchStart >= 0 ? main.indexOf("refreshPinchConstraint(e,t)", pinchStart) : -1;
if (pinchStart < 0 || pinchEnd < 0) throw new Error("pinch gesture method could not be located");
const pinchMethod = main.slice(pinchStart, pinchEnd);
if (pinchMethod.includes("this.exitSettledSvgPresentation(e)")) {
  throw new Error("pinch gestures still hide the settled SVG presentation");
}

const beforePenDownStart = main.indexOf("beforePenDown(){");
const beforePenDownEnd = beforePenDownStart >= 0 ? main.indexOf("endWheelZoomRun(){", beforePenDownStart) : -1;
if (beforePenDownStart < 0 || beforePenDownEnd < 0) {
  throw new Error("pen-down preparation method could not be located");
}
const beforePenDown = main.slice(beforePenDownStart, beforePenDownEnd);
if (beforePenDown.includes('this.exitSettledSvgPresentation("input")')) {
  throw new Error("pen-down preparation hides the settled SVG before lasso classification");
}

const penDownStart = main.indexOf("penDown(e,t){");
const penDownEnd = penDownStart >= 0 ? main.indexOf("beginSnapPreview(e,t)", penDownStart) : -1;
if (penDownStart < 0 || penDownEnd < 0) {
  throw new Error("pen-down method could not be located");
}
const penDownMethod = main.slice(penDownStart, penDownEnd);
const directLassoAt = penDownMethod.indexOf('if(n==="lasso")');
const selectedLassoAt = penDownMethod.indexOf('this.mode="lasso",this.lassoDown(e);return}', directLassoAt + 1);
const deferredInputHideAt = penDownMethod.indexOf('this.exitSettledSvgPresentation("input")');
if (directLassoAt < 0 || selectedLassoAt < 0 || deferredInputHideAt < selectedLassoAt) {
  throw new Error("pen-down input hiding is not deferred until after both lasso paths");
}
if (!penDownMethod.includes('if(n!=="ink")this.exitSettledSvgPresentation("input")')) {
  throw new Error("ordinary ink input still hides the settled SVG presentation");
}

const endPenGestureStart = main.indexOf("endPenGesture(e){");
const endPenGestureEnd = endPenGestureStart >= 0 ? main.indexOf("we.end(performance.now()", endPenGestureStart) : -1;
if (endPenGestureStart < 0 || endPenGestureEnd < 0) {
  throw new Error("pen-up gesture method could not be located");
}
const lassoRelease = main.slice(endPenGestureStart, endPenGestureEnd);
if (!lassoRelease.includes('this.scheduleSettledSvgPresentation("lasso")') || !lassoRelease.includes('this.scheduleRepaint("lasso")')) {
  throw new Error("lasso release does not queue a settled SVG refresh");
}

const pinchScaleStart = main.indexOf("applyPinchScale(e,t)");
const pinchScaleEnd = pinchScaleStart >= 0 ? main.indexOf("columnLocalAt(e)", pinchScaleStart) : -1;
if (pinchScaleStart < 0 || pinchScaleEnd < 0) throw new Error("pinch scale method could not be located");
const pinchScaleMethod = main.slice(pinchScaleStart, pinchScaleEnd);
if (!pinchScaleMethod.includes("this.refreshSettledSvgPinchPreview")) {
  throw new Error("pinch scale frames do not refresh the settled SVG presentation");
}

const readyMethod = extractMethod("settledSvgPresentationReady()", "settledSvgGeometry()");
if (readyMethod.includes("!this.pinchPreview")) {
  throw new Error("settled SVG presentation is still disabled during pinch preview");
}
if (!readyMethod.includes('(this.mode==="ink"||this.mode==="lasso")') || !readyMethod.includes('!this.router?.isStroking||this.mode==="lasso"')) {
  throw new Error("settled SVG presentation is still disabled during lasso interaction");
}
if (!main.includes("refreshSettledSvgPinchPreview(e=\"pinch\")")) {
  throw new Error("settled SVG pinch preview helper is missing");
}
if (!main.includes("this.pinchPreview?this.settledSvgPinchSourceRect()")) {
  throw new Error("pinch SVG presentation is not anchored to the transformed note content");
}
if (!main.includes("settledSvgPinchAnchor=null")) {
  throw new Error("pinch SVG reference state is missing");
}
if (!pinchMethod.includes("this.captureSettledSvgPinchAnchor()")) {
  throw new Error("pinch start does not capture the title/content transform reference");
}
if (!pinchMethod.includes("this.settledSvgPinchAnchor=null")) {
  throw new Error("pinch end does not release the title/content transform reference");
}
if (!main.includes("settledSvgPinchSourceRect()")) {
  throw new Error("shared pinch content source mapping is missing");
}
if (!main.includes("this.pinchPreview?this.settledSvgPinchSourceRect()")) {
  throw new Error("pinch SVG presentation does not use the shared content source mapping");
}
if (!main.includes("sourceWidth:t.width") || !main.includes("sourceHeight:t.height")) {
  throw new Error("pinch SVG reference does not retain the source dimensions at pinch start");
}
if (!main.includes("width:n.sourceWidth*s") || !main.includes("height:n.sourceHeight*s")) {
  throw new Error("pinch SVG source dimensions are not scaled from the captured reference");
}
if (!main.includes("committedSvgRequiredRegion(")) {
  throw new Error("SVG coverage does not distinguish the required viewport from retained coverage");
}
if (!main.includes("getMode")) {
  throw new Error("SVG hot path has no lightweight renderer mode accessor");
}
const presentationUpdateStart = main.indexOf("updateSettledSvgPresentation(e=\"update\")");
const presentationUpdateEnd = presentationUpdateStart >= 0
  ? main.indexOf("scheduleSettledSvgPresentation(e=\"update\")", presentationUpdateStart)
  : -1;
if (presentationUpdateStart < 0 || presentationUpdateEnd < 0) {
  throw new Error("settled SVG presentation update method could not be located");
}
const presentationUpdate = main.slice(presentationUpdateStart, presentationUpdateEnd);
if (presentationUpdate.includes(".report?.()") || presentationUpdate.includes(".report()")) {
  throw new Error("settled SVG presentation still performs diagnostic reports in its frame path");
}

const movementPublishStart = main.indexOf('publishSettledSvgMovement(e="viewport")');
const movementPublishEnd = movementPublishStart >= 0
  ? main.indexOf("writeViewportPan(e=!1)", movementPublishStart)
  : -1;
if (movementPublishStart < 0 || movementPublishEnd < 0) {
  throw new Error("viewport movement does not have a shared settled SVG publication step");
}
const movementPublish = main.slice(movementPublishStart, movementPublishEnd);
if (!movementPublish.includes('this.settledSvgGeometryCache=null')) {
  throw new Error("viewport movement does not invalidate settled SVG geometry before publishing");
}
if (!movementPublish.includes("this.updateSettledSvgPresentation(e)")) {
  throw new Error("viewport movement does not publish the settled SVG frame");
}
const viewportPanStart = main.indexOf("writeViewportPan(e=!1)");
const viewportPanEnd = viewportPanStart >= 0 ? main.indexOf("paperRewrapY=0", viewportPanStart) : -1;
if (viewportPanStart < 0 || viewportPanEnd < 0) {
  throw new Error("viewport pan writer could not be located");
}
const viewportPan = main.slice(viewportPanStart, viewportPanEnd);
const inkTransformAt = viewportPan.indexOf("this.writeInkLayerTransform()");
const movementPublishAt = viewportPan.indexOf("this.publishSettledSvgMovement(");
if (inkTransformAt < 0 || movementPublishAt < 0 || movementPublishAt < inkTransformAt) {
  throw new Error("settled SVG movement is not published after the page transforms are written");
}
const movementPublishMethods = vm.runInNewContext(`({${movementPublish}})`, { Number, String, Object, Array });
const movementCalls = [];
const movementController = {
  committedSvgRenderer: { getMode: () => "svg" },
  settledSvgPresentationReady: () => true,
  settledSvgGeometryCache: { stale: true },
  updateSettledSvgPresentation: reason => movementCalls.push(reason),
};
Object.assign(movementController, movementPublishMethods);
movementController.publishSettledSvgMovement("overscroll");
if (movementController.settledSvgGeometryCache !== null || movementCalls.length !== 1 || movementCalls[0] !== "overscroll") {
  throw new Error("viewport movement did not publish exactly one synchronized SVG frame");
}

const canvasMovementController = {
  committedSvgRenderer: { getMode: () => "canvas" },
  settledSvgPresentationReady: () => true,
  settledSvgGeometryCache: { stale: true },
  updateSettledSvgPresentation: () => movementCalls.push("canvas-mode-update"),
};
Object.assign(canvasMovementController, movementPublishMethods);
canvasMovementController.publishSettledSvgMovement("overscroll");
if (canvasMovementController.settledSvgGeometryCache.stale !== true || movementCalls.includes("canvas-mode-update")) {
  throw new Error("Canvas mode incorrectly published an external SVG movement frame");
}

if (!main.includes("overscrollAllowancePx:()=>0")) {
  throw new Error("canvas gestures still advertise elastic overscroll allowance");
}
if (!main.includes("this.canvasMode&&!r)return!1")) {
  throw new Error("normal canvas settlement can still start an elastic bounce");
}
if (!main.includes("this.startOverscrollBounce(t,tt,xi,!0)")) {
  throw new Error("pinch settlement lost its explicit correction path");
}
const overscrollMethods = vm.runInNewContext(`({${extractMethod(
  "holdOverscrollGive(e,t){",
  "releaseOverscrollGive()",
)}})`, { Number, Math, Object, vp: 24 });
const overscrollController = {
  canvasMode: true,
  retiring: false,
  bounceOffset: { x: 0, y: 0 },
  bounceState: null,
  viewportPan: { x: 0, y: 0 },
  viewportLayout: { externalScale: 1 },
  boundReadout: { floorX: 0, floorY: 0 },
  beginPreviewPaper: () => { throw new Error("canvas edge pull began a preview"); },
  writeViewportPan: () => { throw new Error("canvas edge pull wrote an elastic viewport offset"); },
};
Object.assign(overscrollController, overscrollMethods);
overscrollController.holdOverscrollGive(80, 60);
if (overscrollController.bounceOffset.x !== 0 || overscrollController.bounceOffset.y !== 0) {
  throw new Error(`canvas edge pull created an elastic offset: ${JSON.stringify(overscrollController.bounceOffset)}`);
}

const resumeMethods = vm.runInNewContext(`({${extractMethod(
  "resumeStrandedPan(){",
  "overscrollBounceReadout()",
)}})`, { Number, Math, Object });
let resumeBounceCalls = 0;
let resumeWrites = 0;
const resumeController = {
  canvasMode: true,
  bounceState: null,
  pinchPreview: false,
  frame: { locked: false },
  viewportPan: { x: 30, y: 20 },
  view: { scrollDOM: { scrollLeft: 0, scrollTop: 0 } },
  cssScale: 1,
  leftReserveHeld: 0,
  boundReadout: { floorX: 0, floorY: 0 },
  setViewportScroll: () => {},
  startOverscrollBounce: () => { resumeBounceCalls++; return true; },
  writeViewportPan: () => { resumeWrites++; },
};
Object.assign(resumeController, resumeMethods);
resumeController.resumeStrandedPan();
if (resumeBounceCalls !== 0 || resumeController.viewportPan.x !== 0 || resumeController.viewportPan.y !== 0 || resumeWrites !== 1) {
  throw new Error(`canvas stranded pan was not clamped firmly: ${JSON.stringify({ bounceCalls: resumeBounceCalls, pan: resumeController.viewportPan, writes: resumeWrites })}`);
}
if (!main.includes("pinchFrameCount") || !pinchMethod.includes("recordPinchFrame")) {
  throw new Error("pinch preview frames are not measured separately from repaint frames");
}
const unmountStart = main.indexOf("unmount(){");
const unmountEnd = unmountStart >= 0 ? main.indexOf("mount(){", unmountStart + 8) : -1;
if (unmountStart < 0 || unmountEnd < 0 || !main.slice(unmountStart, unmountEnd).includes("this.pinchPending=null,this.settledSvgPinchAnchor=null")) {
  throw new Error("unmount does not release the settled SVG pinch reference");
}
if (!main.includes("this.pinchPending=null,this.settledSvgPinchAnchor=null,this.pinchAnchor=null,this.pinchRefScale=null,this.view.scrollDOM.scrollLeft=0")) {
  throw new Error("note switches do not release the settled SVG pinch reference");
}
const resizeStart = main.indexOf("handleResize(){", flushStart);
const resizeEnd = resizeStart >= 0 ? main.indexOf("allocateHighlightPair()", resizeStart) : -1;
if (resizeStart < 0 || resizeEnd < 0 || !main.slice(resizeStart, resizeEnd).includes('this.pinchPreview||this.exitSettledSvgPresentation?.("resize")')) {
  throw new Error("resize callbacks can still hide the settled SVG during pinch preview");
}

const settledMethods = vm.runInNewContext(`({${extractMethod(
  "applySettledSvgPresentation(e)",
  "exitSettledSvgPresentation(e=\"hide\")",
)} ,${extractMethod(
  "updateSettledSvgPresentation(e=\"update\")",
  "refreshSettledSvgPinchPreview(e=\"pinch\")",
)} ,${extractMethod(
  "refreshSettledSvgPinchPreview(e=\"pinch\")",
  "scheduleSettledSvgPresentation(e=\"update\")",
)}})`, { Number, String, Object, Array });

const pinchReferenceMethods = vm.runInNewContext(`({${extractMethod(
  "captureSettledSvgPinchAnchor()",
  "settledSvgPinchSourceRect()",
)} ,${extractMethod(
  "settledSvgPinchSourceRect()",
  "updateSettledSvgPresentation(e=\"update\")",
)}})`, { Number, String, Object, Array });

const settledCalls = [];
const settledRoot = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) };
const settledController = {
  settledSvgPresentationMode: "editor",
  settledSvgPresentationRaf: 0,
  settledSvgPresentationGeneration: 0,
  settledSvgPresentationFallbackNoticed: false,
  committedSvgFailed: false,
  scheduleRepaint: reason => settledCalls.push(["repaint", reason]),
  settledSvgPresentation: {
    update: input => {
      settledCalls.push(["update", input.viewBox]);
      return true;
    },
    hide: reason => settledCalls.push(["hide", reason]),
    getGeneration: () => 1,
    getLastReason: () => "updated",
    report: () => ({ generation: 1 }),
  },
  committedSvgRenderer: {
    getMode: () => "svg",
    report: () => ({ mode: "svg" }),
    pen: { getAttribute: () => null },
  },
  committedCanvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) },
  settledSvgPinchSourceRect: () => ({ left: 25, top: 30, width: 100, height: 100 }),
  view: {
    scrollDOM: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) },
    dom: {
      closest: () => settledRoot,
      getBoundingClientRect: () => ({ left: 25, top: 30, width: 100, height: 100 }),
    },
  },
};
let lastSettledInput = null;
settledController.settledSvgPresentation.update = input => {
  lastSettledInput = input;
  settledCalls.push(["update", input.viewBox]);
  return true;
};
Object.assign(settledController, settledMethods);
settledController.settledSvgGeometry = () => ({
  clipRect: { left: 0, top: 0, width: 100, height: 100 },
  rootRect: settledRoot.getBoundingClientRect(),
});
settledController.applySettledSvgPresentation("permanent");
if (settledController.settledSvgPresentationMode !== "permanent") {
  throw new Error("settled SVG presentation did not select permanent mode");
}
if (settledCalls.some(([kind]) => kind === "update")) {
  throw new Error("settled SVG presentation was updated before the first valid SVG viewport");
}
if (settledCalls.length !== 1 || settledCalls[0][0] !== "repaint" || settledCalls[0][1] !== "renderer") {
  throw new Error("settled SVG presentation did not schedule its initialization repaint");
}

settledCalls.length = 0;
settledController.updateSettledSvgPresentation("startup");
if (settledController.committedSvgFailed || settledCalls.length !== 1 || settledCalls[0][0] !== "hide" || settledCalls[0][1] !== "viewport-not-ready") {
  throw new Error("an uninitialized SVG viewBox incorrectly triggered Canvas fallback");
}

settledController.committedSvgRenderer.getViewportViewBox = () => "0 0 100 100";
settledController.committedSvgRenderer.pen.getAttribute = () => "0 0 100 100";
settledController.updateSettledSvgPresentation("ready");
if (!settledCalls.some(([kind, value]) => kind === "update" && value === "0 0 100 100")) {
  throw new Error("settled SVG presentation did not update after a valid viewBox appeared");
}

settledCalls.length = 0;
settledController.committedSvgRenderer.pen.getAttribute = () => "999 999 1 1";
settledController.updateSettledSvgPresentation("canonical-viewport");
settledController.updateSettledSvgPresentation("canonical-viewport-repeat");
const canonicalUpdates = settledCalls.filter(([kind]) => kind === "update").map(([, value]) => value);
if (canonicalUpdates.some(value => value !== "0 0 100 100")) {
  throw new Error("settled SVG presentation reused the displayed cropped viewBox as camera state");
}

settledController.pinchPreview = true;
settledController.updateSettledSvgPresentation("pinch");
if (lastSettledInput?.sourceRect?.left !== 25 || lastSettledInput?.sourceRect?.top !== 30) {
  throw new Error("pinch SVG presentation did not follow the transformed editor reference");
}
settledController.settledSvgPresentationReady = () => true;
settledController.settledSvgGeometryCache = { stale: true };
settledCalls.length = 0;
settledController.refreshSettledSvgPinchPreview("pinch-helper");
if (settledController.settledSvgGeometryCache !== null || !settledCalls.some(([kind]) => kind === "update")) {
  throw new Error("pinch SVG refresh did not invalidate geometry and publish the current frame");
}

let currentSizerRect = { left: 20, top: 30, width: 700, height: 1200 };
let currentCanvasRect = { left: 40, top: 50, width: 100, height: 200 };
const pinchReferenceController = {
  cssScale: 1,
  settledSvgPinchAnchor: null,
  panSizer: () => ({ getBoundingClientRect: () => currentSizerRect }),
  committedCanvas: { getBoundingClientRect: () => currentCanvasRect },
};
Object.assign(pinchReferenceController, pinchReferenceMethods);
if (!pinchReferenceController.captureSettledSvgPinchAnchor()) {
  throw new Error("pinch SVG reference fixture could not capture its initial geometry");
}
currentSizerRect = { left: 50, top: 70, width: 1050, height: 1800 };
currentCanvasRect = { left: 0, top: 0, width: 150, height: 300 };
pinchReferenceController.cssScale = 1.5;
const mappedPinchRect = pinchReferenceController.settledSvgPinchSourceRect();
if (mappedPinchRect.left !== 80 || mappedPinchRect.top !== 100 || mappedPinchRect.width !== 150 || mappedPinchRect.height !== 300) {
  throw new Error(`pinch SVG source mapping lost sizer movement: ${JSON.stringify(mappedPinchRect)}`);
}

let fixedCanvasRect = { left: 40, top: 50, width: 100, height: 200 };
const fixedCanvasPinchController = {
  cssScale: 1,
  settledSvgPinchAnchor: null,
  panSizer: () => ({ getBoundingClientRect: () => currentSizerRect }),
  committedCanvas: { getBoundingClientRect: () => fixedCanvasRect },
};
Object.assign(fixedCanvasPinchController, pinchReferenceMethods);
if (!fixedCanvasPinchController.captureSettledSvgPinchAnchor()) {
  throw new Error("fixed canvas pinch fixture could not capture its initial geometry");
}
fixedCanvasPinchController.cssScale = 1.5;
const fixedCanvasSourceRect = fixedCanvasPinchController.settledSvgPinchSourceRect();
if (fixedCanvasSourceRect.width !== 150 || fixedCanvasSourceRect.height !== 300) {
  throw new Error(`pinch SVG source dimensions did not follow scale: ${JSON.stringify(fixedCanvasSourceRect)}`);
}

const coverageMethods = vm.runInNewContext(`({${extractMethod(
  "committedSvgRequiredRegion(",
  "committedSvgCoverageFor(",
)},${extractMethod(
  "committedSvgCoverageFor(",
  "committedSvgCoverageContains(",
)},${extractMethod(
  "committedSvgCoverageContains(",
  "committedSvgStrokes(){",
)}})`, { Number, Math, Object });
const coverageController = {
  cssWidth: 1000,
  cssHeight: 600,
  camera: { snapshot: { x: 0, y: 0, zoom: 1 } },
  committedSvgCoverage: null,
};
Object.assign(coverageController, coverageMethods);
const initialRequired = coverageController.committedSvgRequiredRegion();
coverageController.committedSvgCoverage = coverageController.committedSvgCoverageFor();
const onePixelPan = coverageController.committedSvgRequiredRegion({ x: 1, y: 0, zoom: 1 });
if (!coverageController.committedSvgCoverageContains(onePixelPan)) {
  throw new Error("a small pan incorrectly invalidates retained SVG coverage");
}
const outsideRequired = coverageController.committedSvgRequiredRegion({ x: 129, y: 0, zoom: 1 });
if (coverageController.committedSvgCoverageContains(outsideRequired)) {
  throw new Error("retained SVG coverage did not invalidate after crossing its padding");
}
if (initialRequired.width !== 1000 || initialRequired.height !== 600) {
  throw new Error(`required SVG coverage changed the visible viewport: ${JSON.stringify(initialRequired)}`);
}

const pinchMetricMethods = vm.runInNewContext(`({${extractMethod(
  "recordPinchFrame(e,t){",
  "recordMovementFrame(",
)}})`, { Number, Math });
const pinchMetrics = {
  pinchFrameCount: 0,
  pinchFrameLastMs: 0,
  pinchFrameMaxMs: 0,
  pinchFrameMissed: 0,
  pinchFrameSamples: [],
  pinchFrameIntervals: [],
  pinchFramePreviousAt: null,
};
Object.assign(pinchMetrics, pinchMetricMethods);
pinchMetrics.recordPinchFrame(10, 20);
pinchMetrics.recordPinchFrame(30, 50);
if (pinchMetrics.pinchFrameCount !== 2 || pinchMetrics.pinchFrameLastMs !== 20
  || pinchMetrics.pinchFrameMaxMs !== 20 || pinchMetrics.pinchFrameIntervals[0] !== 20
  || pinchMetrics.pinchFrameMissed !== 0) {
  throw new Error(`pinch frame metrics were recorded incorrectly: ${JSON.stringify(pinchMetrics)}`);
}

console.log("PASS: committed SVG integration");
