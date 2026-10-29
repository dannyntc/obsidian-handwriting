const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
let bundle = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
}

function replaceMethodRange(label, startNeedle, endNeedle, replacement) {
  const start = bundle.indexOf(startNeedle);
  const end = start >= 0 ? bundle.indexOf(endNeedle, start + startNeedle.length) : -1;
  if (start < 0 || end < 0) throw new Error(`${label}: method range not found`);
  bundle = `${bundle.slice(0, start)}${replacement}${bundle.slice(end)}`;
}

replaceOnce(
  "pinch performance state",
  'repaintQueued=!1;repaintScrollOnly=!1;repaintReason="other";movementFrameSamples=[];movementFrameCount=0;movementFrameLastMs=0;movementFrameMaxMs=0;movementFrameMissed=0;',
  'repaintQueued=!1;repaintScrollOnly=!1;repaintReason="other";movementFrameSamples=[];movementFrameCount=0;movementFrameLastMs=0;movementFrameMaxMs=0;movementFrameMissed=0;pinchFrameSamples=[];pinchFrameIntervals=[];pinchFrameCount=0;pinchFrameLastMs=0;pinchFrameMaxMs=0;pinchFrameMissed=0;pinchFramePreviousAt=null;',
);

replaceOnce(
  "pinch performance recorder",
  "recordMovementFrame(e,t){",
  'recordPinchFrame(e,t){let n=t-e;if(!Number.isFinite(n)||n<0)return;this.pinchFrameCount++,this.pinchFrameLastMs=n,this.pinchFrameMaxMs=Math.max(this.pinchFrameMaxMs,n),this.pinchFrameSamples.push(n),this.pinchFrameSamples.length>120&&this.pinchFrameSamples.shift(),this.pinchFramePreviousAt!==null&&Number.isFinite(e-this.pinchFramePreviousAt)&&(this.pinchFrameIntervals.push(e-this.pinchFramePreviousAt),this.pinchFrameIntervals.length>120&&this.pinchFrameIntervals.shift(),e-this.pinchFramePreviousAt>25&&this.pinchFrameMissed++),this.pinchFramePreviousAt=e}recordMovementFrame(e,t){',
);

const svgMethods = `committedSvgRequiredRegion(e=this.camera.snapshot){let t=Math.max(.01,e.zoom);return{x:e.x,y:e.y,width:Math.max(1,this.cssWidth/t),height:Math.max(1,this.cssHeight/t)}}committedSvgCoverageFor(e=this.camera.snapshot){let t=Math.max(.01,e.zoom),n=128/t,r=this.committedSvgRequiredRegion(e);return{x:r.x-n,y:r.y-n,width:r.width+2*n,height:r.height+2*n}}committedSvgCoverageContains(e){let t=this.committedSvgCoverage;return!!t&&e.x>=t.x&&e.y>=t.y&&e.x+e.width<=t.x+t.width&&e.y+e.height<=t.y+t.height}committedSvgStrokes(){let e=this.filePath();if(!e){this.committedSvgCoverage=null,this.committedSvgCoveragePath=null,this.committedSvgCoverageGeneration=-1;return[]}let t=I.strokes(e),n=this.camera.snapshot,r=this.committedSvgCoverageFor(n);if(this.committedSvgCoverage=r,this.committedSvgCoveragePath=e,this.committedSvgCoverageGeneration=I.generation(e),t.length===0)return[];this.indexDirty&&(this.strokeIndex.rebuild(t),this.indexDirty=!1);let s=this.strokeIndex.query(r);return s}updateCommittedSvgViewport(){let e=this.committedSvgRenderer;if(!e)return!1;let t=this.camera.snapshot,n=this.committedSvgCoverageFor(t);return e.setViewport({x:t.x,y:t.y,width:Math.max(1,this.cssWidth),height:Math.max(1,this.cssHeight),zoom:t.zoom,overscan:128,coverage:n})}reconcileCommittedSvg(e,o={}){let t=this.committedSvgRenderer;if(!t||t.getMode?.()!=="svg")return;let n=performance.now();try{this.updateCommittedSvgViewport();let r=this.filePath(),s=r?I.generation(r):null,a=o.priority&&Array.isArray(e),l=this.committedSvgRequiredRegion(),c=!a&&e===void 0&&this.committedSvgLastPath===r&&this.committedSvgLastGeneration===s&&this.committedSvgCoveragePath===r&&this.committedSvgCoverageGeneration===s&&this.committedSvgCoverageContains(l);if(c){this.lastSvgHandoffMs=Math.max(0,performance.now()-n);return}a?t.upsertCommitted(e):t.reconcile(e??this.committedSvgStrokes()),this.committedSvgLastPath=r,this.committedSvgLastGeneration=s,this.lastSvgHandoffMs=Math.max(0,performance.now()-n)}catch(r){this.lastSvgHandoffMs=Math.max(0,performance.now()-n),this.committedSvgFailed=!0,t.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentation?.hide("svg-fallback"),console.error("[handwriting] committed SVG renderer failed",r),new W.Notice("Handwriting: SVG ink fell back to Canvas"),this.scheduleRepaint("svg-fallback")}}`;
replaceMethodRange("SVG coverage and reconciliation", "committedSvgCoverageFor(", "applySettledSvgPresentation(e)", svgMethods);

const presentationMethods = `applySettledSvgPresentation(e){this.settledSvgPresentationMode="permanent",this.scheduleRepaint("renderer")}exitSettledSvgPresentation(e="hide"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0),this.settledSvgPresentationPending=null;return this.settledSvgPresentation?.hide(e)??!1}settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.getMode?.()==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}updateSettledSvgPresentation(e="update"){let t=this.settledSvgPresentation,n=this.committedSvgRenderer;if(!t||!n||n.getMode?.()!=="svg"){t?.hide(e);return!1}this.settledSvgPresentationReads++;let r=this.pinchPreview?this.settledSvgPinchSourceRect():this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.settledSvgGeometry?.(),o=s?.clipRect,a=s?.rootRect,l=n.getViewportViewBox?.(),c=String(l??"").trim().split(/[\\s,]+/).map(Number);if(c.length!==4||!c.every(Number.isFinite)||c[2]<=0||c[3]<=0){t.hide("viewport-not-ready");return!1}let h=t.getGeneration?.()??this.settledSvgPresentationGeneration,d=t.update({sourceRect:r,clipRect:o,presentationRootRect:a,viewBox:l});if(!d){let u=t.getLastReason?.();if(u==="unsupported-root-transform"||u==="invalid-viewbox"){this.settledSvgPresentation?.hide("svg-fallback"),this.committedSvgFailed=!0,n.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentationFallbackNoticed||(this.settledSvgPresentationFallbackNoticed=!0,new W.Notice("Handwriting: SVG presentation was unavailable, so Canvas is being used")),this.scheduleRepaint("svg-fallback")}return!1}let u=t.getGeneration?.()??h;return u!==h&&this.settledSvgPresentationMutations++,this.settledSvgPresentationGeneration=u,!0}refreshSettledSvgPinchPreview(e="pinch"){if(!this.pinchPreview||!this.settledSvgPresentationReady())return!1;return this.settledSvgGeometryCache=null,this.updateSettledSvgPresentation(e)}scheduleSettledSvgPresentation(e="update"){this.settledSvgPresentationPending=this.settledSvgPresentationReady()?e:null}flushSettledSvgPresentation(){this.settledSvgGeometryCache=null;let e=this.settledSvgPresentationPending;if(this.settledSvgPresentationPending=null,e===null)return!1;return this.settledSvgPresentationFlushes++,this.updateSettledSvgPresentation(e)}`;
replaceMethodRange("presentation hot path", "applySettledSvgPresentation(e)", "handleResize()", presentationMethods);

for (const [before, after] of [
  ['this.committedSvgRenderer?.report().mode==="svg"', 'this.committedSvgRenderer?.getMode?.()==="svg"'],
  ['this.committedSvgRenderer?.report().mode!=="svg"', 'this.committedSvgRenderer?.getMode?.()!=="svg"'],
  ['t.report().mode!=="svg"', 't.getMode?.()!=="svg"'],
  ['n.report().mode!=="svg"', 'n.getMode?.()!=="svg"'],
]) {
  bundle = bundle.split(before).join(after);
}

replaceOnce(
  "pinch frame callback",
  "this.pinchRaf===0&&(this.pinchRaf=this.winRef.requestAnimationFrame(()=>{this.pinchRaf=0,this.flushPinch(!1)}))",
  "this.pinchRaf===0&&(this.pinchRaf=this.winRef.requestAnimationFrame(()=>{let e=performance.now();this.pinchRaf=0;try{this.flushPinch(!1)}finally{this.recordPinchFrame(e,performance.now())}}))",
);

replaceOnce(
  "pinch frame reset",
  "this.captureSettledSvgPinchAnchor(),this.viewportGeneration++",
  "this.captureSettledSvgPinchAnchor(),this.pinchFrameCount=0,this.pinchFrameSamples.length=0,this.pinchFrameIntervals.length=0,this.pinchFrameMissed=0,this.pinchFramePreviousAt=null,this.viewportGeneration++",
);

replaceOnce(
  "pinch frame release",
  "this.settledSvgPinchAnchor=null,this.pinchPreview=!1",
  "this.settledSvgPinchAnchor=null,this.pinchFramePreviousAt=null,this.pinchPreview=!1",
);

replaceOnce(
  "pinch report",
  '`svg movement: ${JSON.stringify({frames:this.movementFrameCount,maxMs:this.movementFrameMaxMs,missedFrames:this.movementFrameMissed,presentationFlushes:this.settledSvgPresentationFlushes,presentationReads:this.settledSvgPresentationReads,presentationMutations:this.settledSvgPresentationMutations})}`,`devicePixelRatio:',
  '`svg movement: ${JSON.stringify({frames:this.movementFrameCount,maxMs:this.movementFrameMaxMs,missedFrames:this.movementFrameMissed,presentationFlushes:this.settledSvgPresentationFlushes,presentationReads:this.settledSvgPresentationReads,presentationMutations:this.settledSvgPresentationMutations})}`,`pinch movement: ${JSON.stringify({frames:this.pinchFrameCount,maxMs:this.pinchFrameMaxMs,missedFrames:this.pinchFrameMissed,samples:this.pinchFrameSamples,intervals:this.pinchFrameIntervals})}`,`devicePixelRatio:',
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js for smooth SVG pan and pinch rendering");
