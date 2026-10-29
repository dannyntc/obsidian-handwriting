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
  "SVG presentation state",
  'settledSvgPresentationGeneration=0;settledSvgPresentationFallbackNoticed=!1;',
  'settledSvgPresentationGeneration=0;settledSvgPresentationPending=null;settledSvgPresentationReads=0;settledSvgPresentationFlushes=0;settledSvgPresentationMutations=0;settledSvgPresentationFallbackNoticed=!1;committedSvgCoverage=null;committedSvgCoveragePath=null;committedSvgCoverageGeneration=-1;',
);

replaceOnce(
  "movement frame state",
  'repaintQueued=!1;repaintScrollOnly=!1;',
  'repaintQueued=!1;repaintScrollOnly=!1;repaintReason="other";movementFrameSamples=[];movementFrameCount=0;movementFrameLastMs=0;movementFrameMaxMs=0;movementFrameMissed=0;',
);

replaceOnce(
  "scroll host visibility",
  'this.scrollFn=()=>{this.exitSettledSvgPresentation("scroll"),this.clearSnapPreview();',
  'this.scrollFn=()=>{this.clearSnapPreview();',
);

replaceOnce(
  "renderer cache reset",
  'this.committedSvgFailed=!1,this.committedSvgLastGeneration=-1,this.committedSvgLastPath=null,this.settledSvgPresentationFallbackNoticed=!1,',
  'this.committedSvgFailed=!1,this.committedSvgLastGeneration=-1,this.committedSvgLastPath=null,this.committedSvgCoverage=null,this.committedSvgCoveragePath=null,this.committedSvgCoverageGeneration=-1,this.settledSvgPresentationFallbackNoticed=!1,',
);

const svgMethods = `committedSvgCoverageFor(e=this.camera.snapshot){let t=Math.max(.01,e.zoom),n=128/t;return{x:e.x-n,y:e.y-n,width:Math.max(1,this.cssWidth/t)+2*n,height:Math.max(1,this.cssHeight/t)+2*n}}committedSvgCoverageContains(e){let t=this.committedSvgCoverage;return!!t&&e.x>=t.x&&e.y>=t.y&&e.x+e.width<=t.x+t.width&&e.y+e.height<=t.y+t.height}committedSvgStrokes(){let e=this.filePath();if(!e){this.committedSvgCoverage=null,this.committedSvgCoveragePath=null,this.committedSvgCoverageGeneration=-1;return[]}let t=I.strokes(e),n=this.camera.snapshot,r=this.committedSvgCoverageFor(n);if(this.committedSvgCoverage=r,this.committedSvgCoveragePath=e,this.committedSvgCoverageGeneration=I.generation(e),t.length===0)return[];this.indexDirty&&(this.strokeIndex.rebuild(t),this.indexDirty=!1);let s=this.strokeIndex.query(r);return s}updateCommittedSvgViewport(){let e=this.committedSvgRenderer;if(!e)return!1;let t=this.camera.snapshot;return e.setViewport({x:t.x,y:t.y,width:Math.max(1,this.cssWidth),height:Math.max(1,this.cssHeight),zoom:t.zoom,overscan:128})}reconcileCommittedSvg(e,o={}){let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;let n=performance.now();try{this.updateCommittedSvgViewport();let r=this.filePath(),s=r?I.generation(r):null,a=o.priority&&Array.isArray(e),l=this.committedSvgCoverageFor(),c=!a&&e===void 0&&this.committedSvgLastPath===r&&this.committedSvgLastGeneration===s&&this.committedSvgCoveragePath===r&&this.committedSvgCoverageGeneration===s&&this.committedSvgCoverageContains(l);if(c){this.lastSvgHandoffMs=Math.max(0,performance.now()-n);return}a?t.upsertCommitted(e):t.reconcile(e??this.committedSvgStrokes()),this.committedSvgLastPath=r,this.committedSvgLastGeneration=s,this.lastSvgHandoffMs=Math.max(0,performance.now()-n)}catch(r){this.lastSvgHandoffMs=Math.max(0,performance.now()-n),this.committedSvgFailed=!0,t.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentation?.hide("svg-fallback"),console.error("[handwriting] committed SVG renderer failed",r),new W.Notice("Handwriting: SVG ink fell back to Canvas"),this.scheduleRepaint("svg-fallback")}}`;
replaceMethodRange("SVG coverage methods", "committedSvgStrokes(){", "applySettledSvgPresentation(e)", svgMethods);

const presentationMethods = `applySettledSvgPresentation(e){this.settledSvgPresentationMode="permanent",this.scheduleRepaint("renderer")}exitSettledSvgPresentation(e="hide"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0),this.settledSvgPresentationPending=null;return this.settledSvgPresentation?.hide(e)??!1}settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.report().mode==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}updateSettledSvgPresentation(e="update"){let t=this.settledSvgPresentation,n=this.committedSvgRenderer;if(!t||!n||n.report().mode!=="svg"){t?.hide(e);return!1}this.settledSvgPresentationReads++;let r=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.settledSvgGeometry?.(),o=s?.clipRect,a=s?.rootRect,l=n.getViewportViewBox?.(),c=String(l??"").trim().split(/[\\s,]+/).map(Number);if(c.length!==4||!c.every(Number.isFinite)||c[2]<=0||c[3]<=0){t.hide("viewport-not-ready");return!1}let h=t.report?.().generation??this.settledSvgPresentationGeneration,d=t.update({sourceRect:r,clipRect:o,presentationRootRect:a,viewBox:l});if(!d){let u=t.report?.().reason;if(u==="unsupported-root-transform"||u==="invalid-viewbox"){this.settledSvgPresentation?.hide("svg-fallback"),this.committedSvgFailed=!0,n.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentationFallbackNoticed||(this.settledSvgPresentationFallbackNoticed=!0,new W.Notice("Handwriting: SVG presentation was unavailable, so Canvas is being used")),this.scheduleRepaint("svg-fallback")}return!1}let u=t.report?.().generation??h;return u!==h&&this.settledSvgPresentationMutations++,this.settledSvgPresentationGeneration=u,!0}scheduleSettledSvgPresentation(e="update"){this.settledSvgPresentationPending=this.settledSvgPresentationReady()?e:null}flushSettledSvgPresentation(){this.settledSvgGeometryCache=null;let e=this.settledSvgPresentationPending;if(this.settledSvgPresentationPending=null,e===null)return!1;return this.settledSvgPresentationFlushes++,this.updateSettledSvgPresentation(e)}`;
replaceMethodRange("presentation scheduling methods", "applySettledSvgPresentation(e)", "handleResize()", presentationMethods);

const scheduleBefore = 'scheduleRepaint(e="other"){if(e!=="scroll"&&e!=="partial"&&(this.damage.addAll(),this.indexDirty=!0),e==="scroll"&&(this.lastScrollAskAt=performance.now()),this.repaintQueued){e!=="scroll"&&(this.repaintScrollOnly=!1);return}this.container&&(this.repaintScrollOnly=e==="scroll",this.repaintQueued=!0,Dv(e),this.winRef.requestAnimationFrame(()=>{this.repaintQueued=!1,this.inQueuedFrame=!0;try{this.repaint(),this.scheduleSettledSvgPresentation(e)}finally{this.inQueuedFrame=!1}}))}';
const scheduleAfter = 'recordMovementFrame(e,t){let n=performance.now()-t;if(e==="scroll"||this.pinchPreview||this.pinchRefScale!==null){this.movementFrameCount++,this.movementFrameLastMs=n,this.movementFrameMaxMs=Math.max(this.movementFrameMaxMs,n),n>16.67&&this.movementFrameMissed++,this.movementFrameSamples.push(n),this.movementFrameSamples.length>120&&this.movementFrameSamples.shift()}}scheduleRepaint(e="other"){if(e!=="scroll"&&e!=="partial"&&(this.damage.addAll(),this.indexDirty=!0),e==="scroll"&&(this.lastScrollAskAt=performance.now()),this.repaintQueued){e!=="scroll"&&(this.repaintScrollOnly=!1);return}this.container&&(this.repaintScrollOnly=e==="scroll",this.repaintReason=e,this.repaintQueued=!0,Dv(e),this.winRef.requestAnimationFrame(()=>{let t=performance.now();this.repaintQueued=!1,this.inQueuedFrame=!0;try{this.repaint()}finally{this.recordMovementFrame(e,t),this.inQueuedFrame=!1}}))}';
replaceOnce("repaint scheduling", scheduleBefore, scheduleAfter);

const repaintAnchor = bundle.indexOf('scheduleRepaint(e="other")');
const repaintStart = repaintAnchor >= 0 ? bundle.indexOf("repaint(){", repaintAnchor) : -1;
const repaintEnd = repaintStart >= 0 ? bundle.indexOf("syncBand(){", repaintStart) : -1;
if (repaintStart < 0 || repaintEnd < 0) throw new Error("note repaint method could not be located");
const repaint = bundle.slice(repaintStart, repaintEnd);
const finalUpdate = repaint.lastIndexOf("this.updateExtent()}");
if (finalUpdate < 0) throw new Error("note repaint completion was not found");
const nextRepaint = `${repaint.slice(0, finalUpdate)}this.scheduleSettledSvgPresentation(this.repaintReason??"repaint"),this.flushSettledSvgPresentation(),this.updateExtent()}`;
bundle = `${bundle.slice(0, repaintStart)}${nextRepaint}${bundle.slice(repaintEnd)}`;

const reportBefore = ',`settled SVG: ${JSON.stringify(this.settledSvgPresentation?.report?.()??{mode:"editor"})}`,`devicePixelRatio:';
const reportAfter = ',`settled SVG: ${JSON.stringify(this.settledSvgPresentation?.report?.()??{mode:"editor"})}`,`svg movement: ${JSON.stringify({frames:this.movementFrameCount,maxMs:this.movementFrameMaxMs,missedFrames:this.movementFrameMissed,presentationFlushes:this.settledSvgPresentationFlushes,presentationReads:this.settledSvgPresentationReads,presentationMutations:this.settledSvgPresentationMutations})}`,`devicePixelRatio:';
replaceOnce("movement diagnostics report", reportBefore, reportAfter);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js for SVG movement performance");
