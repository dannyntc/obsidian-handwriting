const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
let bundle = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "settled SVG geometry state",
  'settledSvgPresentationGeneration=0;settledSvgPresentationPending=null;settledSvgPresentationReads=0;settledSvgPresentationFlushes=0;settledSvgPresentationMutations=0;',
  'settledSvgPresentationGeneration=0;settledSvgPresentationPending=null;settledSvgPresentationReads=0;settledSvgPresentationFlushes=0;settledSvgPresentationMutations=0;settledSvgGeometryCache=null;',
);

replaceOnce(
  "settled SVG geometry method",
  'updateSettledSvgPresentation(e="update"){',
  'settledSvgGeometry(){let e=this.view?.scrollDOM,t=this.view?.dom?.closest?.(".markdown-source-view");if(!e||!t)return null;let n=this.settledSvgGeometryCache;if(n?.scrollElement===e&&n.root===t)return n;let r=e.getBoundingClientRect?.(),s=t.getBoundingClientRect?.();if(!r||!s||!(r.width>0&&r.height>0)||!(s.width>0&&s.height>0))return null;return this.settledSvgGeometryCache={scrollElement:e,root:t,clipRect:{left:r.left,top:r.top,width:r.width,height:r.height},rootRect:{left:s.left,top:s.top,width:s.width,height:s.height}}}updateSettledSvgPresentation(e="update"){',
);

replaceOnce(
  "settled SVG geometry invalidation",
  'handleResize(){this.exitSettledSvgPresentation?.("resize");',
  'handleResize(){this.settledSvgGeometryCache=null,this.exitSettledSvgPresentation?.("resize");',
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js with cached SVG presentation geometry");
