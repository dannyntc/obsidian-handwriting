const fs = require("node:fs");
const vm = require("node:vm");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "settled SVG observer field",
  'committedCanvas;committedSvgRenderer=null;committedSvgFailed=!1;settledSvgPresentation=null;settledSvgPresentationMode="editor";settledSvgPresentationRaf=0;settledSvgPresentationStable=0;settledSvgPresentationRectKey="";wetCanvas;',
  'committedCanvas;committedSvgRenderer=null;committedSvgFailed=!1;settledSvgPresentation=null;settledSvgPresentationObserver=null;settledSvgPresentationMode="editor";settledSvgPresentationRaf=0;settledSvgPresentationStable=0;settledSvgPresentationRectKey="";wetCanvas;',
);

replaceOnce(
  "settled SVG note-local mount",
  'this.committedSvgRenderer=HandwritingCommittedSvg.create(s,{document:t.ownerDocument,highlighterBefore:this.highlightCanvas,penBefore:this.committedCanvas,highlighterOpacity:q,path:e=>TE(e),color:e=>ct(e.tool,e.color)}),this.settledSvgPresentation=HandwritingSettledSvgPresentation.create({document:t.ownerDocument,layers:{highlighter:this.committedSvgRenderer.highlighter,pen:this.committedSvgRenderer.pen},externalParent:t.ownerDocument.body,clip:()=>this.view.scrollDOM.getBoundingClientRect()}),this.applyCompletedInkRenderer(j.completedInkRenderer),this.applySettledSvgPresentation(j.settledSvgPresentation),this.tailWashed=!1;',
  'this.committedSvgRenderer=HandwritingCommittedSvg.create(s,{document:t.ownerDocument,highlighterBefore:this.highlightCanvas,penBefore:this.committedCanvas,highlighterOpacity:q,path:e=>TE(e),color:e=>ct(e.tool,e.color)}),this.settledSvgPresentation=HandwritingSettledSvgPresentation.create({document:t.ownerDocument,layers:{highlighter:this.committedSvgRenderer.highlighter,pen:this.committedSvgRenderer.pen},presentationRoot:this.view.dom.closest(".markdown-source-view"),clip:()=>this.view.scrollDOM.getBoundingClientRect()}),this.settledSvgPresentationObserver=this.winRef.ResizeObserver?new this.winRef.ResizeObserver(()=>{this.exitSettledSvgPresentation("layout"),this.scheduleSettledSvgPresentation("layout")}):null,this.settledSvgPresentationObserver?.observe(this.view.dom.closest(".markdown-source-view")),this.settledSvgPresentationObserver?.observe(this.view.scrollDOM),this.applyCompletedInkRenderer(j.completedInkRenderer),this.applySettledSvgPresentation(j.settledSvgPresentation),this.tailWashed=!1;',
);

const classStart = bundle.indexOf("var Ep=class");
const methodStart = bundle.indexOf("applySettledSvgPresentation(e){", classStart);
const methodEnd = bundle.indexOf("handleResize(){", methodStart);
if (classStart < 0 || methodStart < 0 || methodEnd < 0 || methodEnd <= methodStart) {
  throw new Error("settled SVG lifecycle method range is missing");
}
const oldMethods = bundle.slice(methodStart, methodEnd);
if (oldMethods.includes("presentationRootRect:a") || !oldMethods.includes("this.view.scrollDOM?.getBoundingClientRect?.()")) {
  throw new Error("settled SVG lifecycle method range is already updated or unexpected");
}
const settledMethods = 'applySettledSvgPresentation(e){this.exitSettledSvgPresentation("setting"),this.settledSvgPresentationMode=e==="external"?"external":"editor",this.settledSvgPresentationMode==="external"&&this.scheduleSettledSvgPresentation("setting")}exitSettledSvgPresentation(e="restore-editor"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0),this.settledSvgPresentationStable=0,this.settledSvgPresentationRectKey="";return this.settledSvgPresentation?.exit(e)??!1}settledSvgPresentationReady(){return this.settledSvgPresentationMode==="external"&&!!this.container&&!this.retiring&&this.committedSvgRenderer?.report().mode==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}scheduleSettledSvgPresentation(e="settle"){if(this.settledSvgPresentationRaf||!this.settledSvgPresentationReady())return;this.settledSvgPresentationStable=0,this.settledSvgPresentationRectKey="";let t=()=>{if(this.settledSvgPresentationRaf=0,!this.settledSvgPresentationReady())return;let n=this.committedSvgRenderer?.pen?.getBoundingClientRect?.(),r=this.view.scrollDOM?.getBoundingClientRect?.(),a=this.view.dom?.closest?.(".markdown-source-view")?.getBoundingClientRect?.();if(!n||!r||!a||n.width<=0||n.height<=0||r.width<=0||r.height<=0||a.width<=0||a.height<=0){this.settledSvgPresentationStable=0,this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t);return}let s=[n.left,n.top,n.width,n.height,r.left,r.top,r.width,r.height,a.left,a.top,a.width,a.height].map(o=>Number.isFinite(o)?o.toFixed(3):"nan").join(",");this.settledSvgPresentationRectKey===s?this.settledSvgPresentationStable++:(this.settledSvgPresentationRectKey=s,this.settledSvgPresentationStable=1);if(this.settledSvgPresentationStable<2){this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t);return}this.settledSvgPresentation.enter({sourceRect:n,clipRect:r,presentationRootRect:a})};this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t)}';
bundle = `${bundle.slice(0, methodStart)}${settledMethods}${bundle.slice(methodEnd)}`;

replaceOnce(
  "settled SVG observer disposal",
  'this.restorePinchLayers(),this.exitSettledSvgPresentation("unmount"),this.settledSvgPresentation?.dispose(),this.settledSvgPresentation=null,this.container&&this.releaseBackings(),this.container?.remove(),',
  'this.restorePinchLayers(),this.exitSettledSvgPresentation("unmount"),this.settledSvgPresentationObserver?.disconnect(),this.settledSvgPresentationObserver=null,this.settledSvgPresentation?.dispose(),this.settledSvgPresentation=null,this.container&&this.releaseBackings(),this.container?.remove(),',
);

new vm.Script(bundle, { filename: path });
fs.writeFileSync(path, bundle);
console.log("Updated main.js with note-local settled SVG presentation");
