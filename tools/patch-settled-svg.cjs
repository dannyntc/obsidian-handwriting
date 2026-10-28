const fs = require("node:fs");
const vm = require("node:vm");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

function insertBeforeClassMethod(label, classNeedle, methodNeedle, source) {
  const classStart = bundle.indexOf(classNeedle);
  if (classStart < 0) throw new Error(`${label}: class anchor is missing`);
  const methodStart = bundle.indexOf(methodNeedle, classStart);
  if (methodStart < 0) throw new Error(`${label}: method anchor is missing`);
  bundle = `${bundle.slice(0, methodStart)}${source}${bundle.slice(methodStart)}`;
}

replaceOnce(
  "controller settled SVG fields",
  "committedCanvas;committedSvgRenderer=null;committedSvgFailed=!1;wetCanvas;",
  "committedCanvas;committedSvgRenderer=null;committedSvgFailed=!1;settledSvgPresentation=null;settledSvgPresentationObserver=null;settledSvgPresentationMode=\"editor\";settledSvgPresentationRaf=0;settledSvgPresentationStable=0;settledSvgPresentationRectKey=\"\";wetCanvas;",
);

replaceOnce(
  "controller settled SVG mount",
  "this.committedSvgRenderer=HandwritingCommittedSvg.create(s,{document:t.ownerDocument,highlighterBefore:this.highlightCanvas,penBefore:this.committedCanvas,highlighterOpacity:q,path:e=>TE(e),color:e=>ct(e.tool,e.color)}),this.applyCompletedInkRenderer(j.completedInkRenderer),this.tailWashed=!1;",
  "this.committedSvgRenderer=HandwritingCommittedSvg.create(s,{document:t.ownerDocument,highlighterBefore:this.highlightCanvas,penBefore:this.committedCanvas,highlighterOpacity:q,path:e=>TE(e),color:e=>ct(e.tool,e.color)}),this.settledSvgPresentation=HandwritingSettledSvgPresentation.create({document:t.ownerDocument,layers:{highlighter:this.committedSvgRenderer.highlighter,pen:this.committedSvgRenderer.pen},presentationRoot:this.view.dom.closest(\".markdown-source-view\"),clip:()=>this.view.scrollDOM.getBoundingClientRect()}),this.settledSvgPresentationObserver=this.winRef.ResizeObserver?new this.winRef.ResizeObserver(()=>{this.exitSettledSvgPresentation(\"layout\"),this.scheduleSettledSvgPresentation(\"layout\")}):null,this.settledSvgPresentationObserver?.observe(this.view.dom.closest(\".markdown-source-view\")),this.settledSvgPresentationObserver?.observe(this.view.scrollDOM),this.applyCompletedInkRenderer(j.completedInkRenderer),this.applySettledSvgPresentation(j.settledSvgPresentation),this.tailWashed=!1;",
);

const settledMethods = `applySettledSvgPresentation(e){this.exitSettledSvgPresentation("setting"),this.settledSvgPresentationMode=e==="external"?"external":"editor",this.settledSvgPresentationMode==="external"&&this.scheduleSettledSvgPresentation("setting")}exitSettledSvgPresentation(e="restore-editor"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0),this.settledSvgPresentationStable=0,this.settledSvgPresentationRectKey="";return this.settledSvgPresentation?.exit(e)??!1}settledSvgPresentationReady(){return this.settledSvgPresentationMode==="external"&&!!this.container&&!this.retiring&&this.committedSvgRenderer?.report().mode==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}scheduleSettledSvgPresentation(e="settle"){if(this.settledSvgPresentationRaf||!this.settledSvgPresentationReady())return;this.settledSvgPresentationStable=0,this.settledSvgPresentationRectKey="";let t=()=>{if(this.settledSvgPresentationRaf=0,!this.settledSvgPresentationReady())return;let n=this.committedSvgRenderer?.pen?.getBoundingClientRect?.(),r=this.view.scrollDOM?.getBoundingClientRect?.(),a=this.view.dom?.closest?.(".markdown-source-view")?.getBoundingClientRect?.();if(!n||!r||!a||n.width<=0||n.height<=0||r.width<=0||r.height<=0||a.width<=0||a.height<=0){this.settledSvgPresentationStable=0,this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t);return}let s=[n.left,n.top,n.width,n.height,r.left,r.top,r.width,r.height,a.left,a.top,a.width,a.height].map(o=>Number.isFinite(o)?o.toFixed(3):"nan").join(",");this.settledSvgPresentationRectKey===s?this.settledSvgPresentationStable++:(this.settledSvgPresentationRectKey=s,this.settledSvgPresentationStable=1);if(this.settledSvgPresentationStable<2){this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t);return}this.settledSvgPresentation.enter({sourceRect:n,clipRect:r,presentationRootRect:a})};this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t)}`;

insertBeforeClassMethod("controller settled SVG methods", "var Ep=class", "handleResize(){", settledMethods);

replaceOnce(
  "renderer switch exits external presentation",
  'applyCompletedInkRenderer(e){if(!this.committedSvgRenderer)return;let t=e==="canvas"?"canvas":"svg";this.committedSvgFailed=!1,this.committedSvgRenderer.setMode(t);let n=t==="svg"?"hidden":"visible";this.committedCanvas?.setCssStyles({visibility:n}),this.highlightCanvas?.setCssStyles({visibility:n}),t==="svg"?this.reconcileCommittedSvg():this.scheduleRepaint("renderer")}',
  'applyCompletedInkRenderer(e){if(!this.committedSvgRenderer)return;this.exitSettledSvgPresentation("renderer");let t=e==="canvas"?"canvas":"svg";this.committedSvgFailed=!1,this.committedSvgRenderer.setMode(t);let n=t==="svg"?"hidden":"visible";this.committedCanvas?.setCssStyles({visibility:n}),this.highlightCanvas?.setCssStyles({visibility:n}),t==="svg"?(this.reconcileCommittedSvg(),this.scheduleSettledSvgPresentation("renderer")):this.scheduleRepaint("renderer")}',
);

replaceOnce(
  "reconcile exits external presentation",
  'reconcileCommittedSvg(e){let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;',
  'reconcileCommittedSvg(e){this.exitSettledSvgPresentation("reconcile");let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;',
);

replaceOnce(
  "resize exits external presentation",
  "handleResize(){if(this.deferPinchRaster())return;",
  'handleResize(){this.exitSettledSvgPresentation?.("resize");if(this.deferPinchRaster())return;',
);

replaceOnce(
  "repaint exits external presentation",
  "repaint(){if(this.committedSvgRenderer?.report().mode===\"svg\")",
  'repaint(){this.exitSettledSvgPresentation("repaint");if(this.committedSvgRenderer?.report().mode==="svg")',
);

replaceOnce(
  "repaint schedules settled presentation",
  'this.winRef.requestAnimationFrame(()=>{this.repaintQueued=!1,this.inQueuedFrame=!0;try{this.repaint()}finally{this.inQueuedFrame=!1}})',
  'this.winRef.requestAnimationFrame(()=>{this.repaintQueued=!1,this.inQueuedFrame=!0;try{this.repaint(),this.scheduleSettledSvgPresentation(e)}finally{this.inQueuedFrame=!1}})',
);

replaceOnce(
  "pen input exits external presentation",
  'beforePenDown(){this.endWheelZoomRun(),',
  'beforePenDown(){this.exitSettledSvgPresentation("input"),this.endWheelZoomRun(),',
);

replaceOnce(
  "pinch exits external presentation",
  'pinch(e,t,n){if(this.retiring||!this.canvasMode)return;',
  'pinch(e,t,n){this.exitSettledSvgPresentation(e);if(this.retiring||!this.canvasMode)return;',
);

replaceOnce(
  "scroll exits external presentation",
  'this.scrollFn=()=>{this.clearSnapPreview();',
  'this.scrollFn=()=>{this.exitSettledSvgPresentation("scroll"),this.clearSnapPreview();',
);

replaceOnce(
  "note switch exits external presentation",
  'else{this.saveNoteCamera(),this.lastFile=r,',
  'else{this.exitSettledSvgPresentation("note-switch"),this.saveNoteCamera(),this.lastFile=r,',
);

replaceOnce(
  "unmount disposes settled presentation",
  'this.restorePinchLayers(),this.container&&this.releaseBackings(),this.container?.remove(),',
  'this.restorePinchLayers(),this.exitSettledSvgPresentation("unmount"),this.settledSvgPresentationObserver?.disconnect(),this.settledSvgPresentationObserver=null,this.settledSvgPresentation?.dispose(),this.settledSvgPresentation=null,this.container&&this.releaseBackings(),this.container?.remove(),',
);

replaceOnce(
  "zoom report settled presentation",
  '`completed ink: ${JSON.stringify(this.committedSvgRenderer?.report?.()??{mode:"canvas"})}`,`devicePixelRatio:',
  '`completed ink: ${JSON.stringify(this.committedSvgRenderer?.report?.()??{mode:"canvas"})}`,`settled SVG: ${JSON.stringify(this.settledSvgPresentation?.report?.()??{mode:"editor"})}`,`devicePixelRatio:',
);

replaceOnce(
  "default settled presentation",
  'completedInkRenderer:"svg",inkAdaptsToTheme:',
  'completedInkRenderer:"svg",settledSvgPresentation:"editor",inkAdaptsToTheme:',
);

replaceOnce(
  "parsed settled presentation",
  'completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",inkAdaptsToTheme:',
  'completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",settledSvgPresentation:e?.settledSvgPresentation==="external"?"external":"editor",inkAdaptsToTheme:',
);

replaceOnce(
  "runtime settled presentation",
  'j.completedInkRenderer=this.settings.completedInkRenderer==="canvas"?"canvas":"svg",_o(this.settings.penTools),',
  'j.completedInkRenderer=this.settings.completedInkRenderer==="canvas"?"canvas":"svg",j.settledSvgPresentation=this.settings.settledSvgPresentation==="external"?"external":"editor",_o(this.settings.penTools),',
);

replaceOnce(
  "runtime settled presentation propagation",
  'B.forEach(e=>e.applyCompletedInkRenderer?.(this.settings.completedInkRenderer))}',
  'B.forEach(e=>e.applyCompletedInkRenderer?.(this.settings.completedInkRenderer)),B.forEach(e=>e.applySettledSvgPresentation?.(this.settings.settledSvgPresentation))}',
);

replaceOnce(
  "settled presentation setting",
  '{name:"Developer diagnostics",desc:"Show diagnostic commands after reloading the plugin. Global setting. Default off.",control:{type:"toggle",key:"devDiagnostics"}},{name:"Boox mode",',
  '{name:"Developer diagnostics",desc:"Show diagnostic commands after reloading the plugin. Global setting. Default off.",control:{type:"toggle",key:"devDiagnostics"}},{name:"Settled SVG presentation",desc:"Developer experiment for completed SVG ink. Editor keeps the original layer; External moves settled ink outside the scaled editor for sharpness testing.",control:{type:"dropdown",key:"settledSvgPresentation",options:{editor:"Editor (default)",external:"External (experiment)"}}},{name:"Boox mode",',
);

replaceOnce(
  "settled presentation setting handler",
  'case"devDiagnostics":r.devDiagnostics=s;break;case"paperStyle":',
  'case"devDiagnostics":r.devDiagnostics=s;break;case"settledSvgPresentation":r.settledSvgPresentation=o==="external"?"external":"editor",this.plugin.applyRuntimeSettings(),this.rerender();break;case"paperStyle":',
);

new vm.Script(bundle, { filename: path });
fs.writeFileSync(path, bundle);
console.log("Updated main.js with settled SVG presentation lifecycle");
