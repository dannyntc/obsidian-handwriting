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
  'settledSvgPresentationGeneration=0;wetCanvas;',
  'settledSvgPresentationGeneration=0;settledSvgPresentationFallbackNoticed=!1;wetCanvas;',
  "SVG fallback field",
);
replaceOnce(
  'this.committedSvgFailed=!1,this.committedSvgRenderer.setMode(t);',
  'this.committedSvgFailed=!1,this.settledSvgPresentationFallbackNoticed=!1,this.committedSvgRenderer.setMode(t);',
  "SVG fallback reset",
);
replaceOnce(
  'applySettledSvgPresentation(e){this.settledSvgPresentationMode="permanent",this.updateSettledSvgPresentation("setting")}exitSettledSvgPresentation(e="hide"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0);return this.settledSvgPresentation?.hide(e)??!1}settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.report().mode==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}updateSettledSvgPresentation(e="update"){let t=this.settledSvgPresentation,n=this.committedSvgRenderer;if(!t||!n||n.report().mode!=="svg"){t?.hide(e);return!1}let r=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.view.scrollDOM?.getBoundingClientRect?.(),o=this.view.dom?.closest?.(".markdown-source-view"),a=o?.getBoundingClientRect?.(),l=n.pen?.getAttribute?.("viewBox"),c=t.update({sourceRect:r,clipRect:s,presentationRootRect:a,viewBox:l});return c&&(this.settledSvgPresentationGeneration=t.report?.().generation??this.settledSvgPresentationGeneration),c}scheduleSettledSvgPresentation(e="update"){if(this.settledSvgPresentationRaf||!this.settledSvgPresentationReady())return;this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(()=>{this.settledSvgPresentationRaf=0,this.updateSettledSvgPresentation(e)})}',
  'applySettledSvgPresentation(e){this.settledSvgPresentationMode="permanent",this.updateSettledSvgPresentation("setting")}exitSettledSvgPresentation(e="hide"){let t=this.settledSvgPresentationRaf;t&&(this.winRef.cancelAnimationFrame(t),this.settledSvgPresentationRaf=0);return this.settledSvgPresentation?.hide(e)??!1}settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.report().mode==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}updateSettledSvgPresentation(e="update"){let t=this.settledSvgPresentation,n=this.committedSvgRenderer;if(!t||!n||n.report().mode!=="svg"){t?.hide(e);return!1}let r=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.view.scrollDOM?.getBoundingClientRect?.(),o=this.view.dom?.closest?.(".markdown-source-view"),a=o?.getBoundingClientRect?.(),l=n.pen?.getAttribute?.("viewBox"),c=t.update({sourceRect:r,clipRect:s,presentationRootRect:a,viewBox:l});if(!c){let h=t.report?.().reason;if(h==="unsupported-root-transform"||h==="invalid-viewbox"){this.settledSvgPresentation?.hide("svg-fallback"),this.committedSvgFailed=!0,n.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentationFallbackNoticed||(this.settledSvgPresentationFallbackNoticed=!0,new W.Notice("Handwriting: SVG presentation was unavailable, so Canvas is being used")),this.scheduleRepaint("svg-fallback")}return!1}return this.settledSvgPresentationGeneration=t.report?.().generation??this.settledSvgPresentationGeneration,!0}scheduleSettledSvgPresentation(e="update"){if(this.settledSvgPresentationRaf||!this.settledSvgPresentationReady())return;this.settledSvgPresentationRaf=this.winRef.requestAnimationFrame(()=>{this.settledSvgPresentationRaf=0,this.updateSettledSvgPresentation(e)})}',
  "permanent SVG fallback lifecycle",
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js with safe Canvas fallback for permanent SVG presentation");
