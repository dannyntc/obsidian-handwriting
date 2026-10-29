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
  "pinch SVG reference state",
  "settledSvgGeometryCache=null;settledSvgPresentationFallbackNoticed=!1;",
  "settledSvgGeometryCache=null;settledSvgPinchAnchor=null;settledSvgPresentationFallbackNoticed=!1;",
);

replaceOnce(
  "pinch preview presentation source",
  "this.settledSvgPresentationReads++;let r=(this.pinchPreview?this.view?.dom?.getBoundingClientRect?.():null)??this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),",
  "this.settledSvgPresentationReads++;let r=this.pinchPreview?this.settledSvgPinchSourceRect():this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),",
);

replaceOnce(
  "pinch SVG reference methods",
  "updateSettledSvgPresentation(e=\"update\")",
  "captureSettledSvgPinchAnchor(){let e=this.panSizer?.()?.getBoundingClientRect?.(),t=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),n=this.cssScale;if(!e||!t||!(e.width>0&&e.height>0)||!(t.width>0&&t.height>0)||!(n>0)){this.settledSvgPinchAnchor=null;return!1}return this.settledSvgPinchAnchor={sourceLeft:t.left,sourceTop:t.top,sizerLeft:e.left,sizerTop:e.top,scale:n},!0}settledSvgPinchSourceRect(){let e=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),t=this.panSizer?.()?.getBoundingClientRect?.(),n=this.settledSvgPinchAnchor,r=this.cssScale;if(!e||!t||!n||!(r>0)||!(n.scale>0))return e;let s=r/n.scale;return{left:t.left+(n.sourceLeft-n.sizerLeft)*s,top:t.top+(n.sourceTop-n.sizerTop)*s,width:e.width,height:e.height}}updateSettledSvgPresentation(e=\"update\")",
);

replaceOnce(
  "pinch start reference capture",
  'this.cancelOverscrollBounce(),this.retirePanSettle("a new pinch"),this.hideBlankPinchLayers(),this.viewportGeneration++,',
  'this.cancelOverscrollBounce(),this.retirePanSettle("a new pinch"),this.hideBlankPinchLayers(),this.captureSettledSvgPinchAnchor(),this.viewportGeneration++,',
);

replaceOnce(
  "pinch end reference release",
  "this.pinchRefScale=null,this.pinchAnchor=null,this.pinchPreview=!1,",
  "this.pinchRefScale=null,this.pinchAnchor=null,this.settledSvgPinchAnchor=null,this.pinchPreview=!1,",
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js to keep settled SVG synchronized during pinch zoom");
