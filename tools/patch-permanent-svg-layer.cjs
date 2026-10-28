const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
let bundle = fs.readFileSync(bundlePath, "utf8");

const replaceOnce = (oldText, newText, label) => {
  const count = bundle.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(oldText, newText);
};

replaceOnce(
  'committedCanvas;committedSvgRenderer=null;committedSvgFailed=!1;settledSvgPresentation=null;settledSvgPresentationObserver=null;settledSvgPresentationMode="editor";settledSvgPresentationRaf=0;settledSvgPresentationStable=0;settledSvgPresentationRectKey="";wetCanvas;',
  'committedCanvas;committedSvgRenderer=null;committedSvgFailed=!1;settledSvgPresentation=null;settledSvgPresentationMode="permanent";settledSvgPresentationRaf=0;settledSvgPresentationRectKey="";settledSvgPresentationGeneration=0;wetCanvas;',
  "controller presentation fields",
);

replaceOnce(
  'this.committedSvgRenderer=HandwritingCommittedSvg.create(s,{document:t.ownerDocument,highlighterBefore:this.highlightCanvas,penBefore:this.committedCanvas,highlighterOpacity:q,path:e=>TE(e),color:e=>ct(e.tool,e.color)}),this.settledSvgPresentation=HandwritingSettledSvgPresentation.create({document:t.ownerDocument,layers:{highlighter:this.committedSvgRenderer.highlighter,pen:this.committedSvgRenderer.pen},presentationRoot:this.view.dom.closest(".markdown-source-view"),clip:()=>this.view.scrollDOM.getBoundingClientRect()}),this.settledSvgPresentationObserver=this.winRef.ResizeObserver?new this.winRef.ResizeObserver(()=>{this.exitSettledSvgPresentation("layout"),this.scheduleSettledSvgPresentation("layout")}):null,this.settledSvgPresentationObserver?.observe(this.view.dom.closest(".markdown-source-view")),this.settledSvgPresentationObserver?.observe(this.view.scrollDOM),this.applyCompletedInkRenderer(j.completedInkRenderer),this.applySettledSvgPresentation(j.settledSvgPresentation),',
  'this.settledSvgPresentation=HandwritingSettledSvgPresentation.create({document:t.ownerDocument,presentationRoot:this.view.dom.closest(".markdown-source-view"),editor:t,scrollElement:n,window:this.winRef}),this.committedSvgRenderer=HandwritingCommittedSvg.create(this.settledSvgPresentation.layerRoot,{document:t.ownerDocument,highlighterOpacity:q,path:e=>TE(e),color:e=>ct(e.tool,e.color)}),this.settledSvgPresentation.attach({highlighter:this.committedSvgRenderer.highlighter,pen:this.committedSvgRenderer.pen}),this.applyCompletedInkRenderer(j.completedInkRenderer),this.applySettledSvgPresentation(j.settledSvgPresentation),',
  "controller permanent host mount",
);

const oldMethods = 'applySettledSvgPresentation(e){this.exitSettledSvgPresentation("setting"),this.settledSvgPresentationMode=e==="external"?"external":"editor",this.settledSvgPresentationMode==="external"&&this.scheduleSettledSvgPresentation("setting")}exitSettledSvgPresentation(e="restore-editor"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0),this.settledSvgPresentationStable=0,this.settledSvgPresentationRectKey="";return this.settledSvgPresentation?.exit(e)??!1}settledSvgPresentationReady(){return this.settledSvgPresentationMode==="external"&&!!this.container&&!this.retiring&&this.committedSvgRenderer?.report().mode==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}scheduleSettledSvgPresentation(e="settle"){if(this.settledSvgPresentationRaf||!this.settledSvgPresentationReady())return;this.settledSvgPresentationStable=0,this.settledSvgPresentationRectKey="";let t=()=>{if(this.settledSvgPresentationRaf=0,!this.settledSvgPresentationReady())return;let n=this.committedSvgRenderer?.pen?.getBoundingClientRect?.(),r=this.view.scrollDOM?.getBoundingClientRect?.(),a=this.view.dom?.closest?.(".markdown-source-view")?.getBoundingClientRect?.();if(!n||!r||!a||n.width<=0||n.height<=0||r.width<=0||r.height<=0||a.width<=0||a.height<=0){this.settledSvgPresentationStable=0,this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t);return}let s=[n.left,n.top,n.width,n.height,r.left,r.top,r.width,r.height,a.left,a.top,a.width,a.height].map(o=>Number.isFinite(o)?o.toFixed(3):"nan").join(",");this.settledSvgPresentationRectKey===s?this.settledSvgPresentationStable++:(this.settledSvgPresentationRectKey=s,this.settledSvgPresentationStable=1);if(this.settledSvgPresentationStable<2){this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t);return}this.settledSvgPresentation.enter({sourceRect:n,clipRect:r,presentationRootRect:a})};this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(t)}';
const newMethods = 'applySettledSvgPresentation(e){this.settledSvgPresentationMode="permanent",this.updateSettledSvgPresentation("setting")}exitSettledSvgPresentation(e="hide"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0);return this.settledSvgPresentation?.hide(e)??!1}settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.report().mode==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}updateSettledSvgPresentation(e="update"){let t=this.settledSvgPresentation,n=this.committedSvgRenderer;if(!t||!n||n.report().mode!=="svg"){t?.hide(e);return!1}let r=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.view.scrollDOM?.getBoundingClientRect?.(),o=this.view.dom?.closest?.(".markdown-source-view"),a=o?.getBoundingClientRect?.(),l=n.pen?.getAttribute?.("viewBox"),c=t.update({sourceRect:r,clipRect:s,presentationRootRect:a,viewBox:l});return c&&(this.settledSvgPresentationGeneration=t.report?.().generation??this.settledSvgPresentationGeneration),c}scheduleSettledSvgPresentation(e="update"){if(this.settledSvgPresentationRaf||!this.settledSvgPresentationReady())return;this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(()=>{this.settledSvgPresentationRaf=0,this.updateSettledSvgPresentation(e)})}';
replaceOnce(oldMethods, newMethods, "controller presentation lifecycle");

replaceOnce(
  'reconcileCommittedSvg(e){this.exitSettledSvgPresentation("reconcile");let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;try{this.updateCommittedSvgViewport(),t.reconcile(e??this.committedSvgStrokes())}catch(n){this.committedSvgFailed=!0,t.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),console.error("[handwriting] committed SVG renderer failed",n),new W.Notice("Handwriting: SVG ink fell back to Canvas"),this.scheduleRepaint("svg-fallback")}}',
  'reconcileCommittedSvg(e){let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;try{this.updateCommittedSvgViewport(),t.reconcile(e??this.committedSvgStrokes()),this.updateSettledSvgPresentation("reconcile")}catch(n){this.committedSvgFailed=!0,t.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentation?.hide("svg-fallback"),console.error("[handwriting] committed SVG renderer failed",n),new W.Notice("Handwriting: SVG ink fell back to Canvas"),this.scheduleRepaint("svg-fallback")}}',
  "controller SVG reconciliation",
);

replaceOnce(
  'this.restorePinchLayers(),this.exitSettledSvgPresentation("unmount"),this.settledSvgPresentationObserver?.disconnect(),this.settledSvgPresentationObserver=null,this.settledSvgPresentation?.dispose(),this.settledSvgPresentation=null,',
  'this.restorePinchLayers(),this.exitSettledSvgPresentation("unmount"),this.committedSvgRenderer?.dispose?.(),this.committedSvgRenderer=null,this.settledSvgPresentation?.dispose(),this.settledSvgPresentation=null,',
  "controller SVG teardown",
);

if (bundle.includes("settledSvgPresentationObserver")) throw new Error("presentation observer lifecycle remains in bundle");
if (bundle.includes("settledSvgPresentation.enter")) throw new Error("moving presentation lifecycle remains in bundle");
new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js for permanent note-local SVG presentation");
