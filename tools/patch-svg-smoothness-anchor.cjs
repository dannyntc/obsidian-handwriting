const fs = require("node:fs");
const vm = require("node:vm");

const file = "main.js";
let bundle = fs.readFileSync(file, "utf8");
if (bundle.includes("captureSettledSvgPinchAnchor(){")) {
  throw new Error("settled SVG pinch anchor methods are already present");
}

const start = bundle.indexOf("settledSvgGeometry(){");
const end = bundle.indexOf("updateSettledSvgPresentation(e=\"update\")", start);
if (start < 0 || end < 0) throw new Error("settled SVG geometry insertion point not found");

const anchorMethods = 'captureSettledSvgPinchAnchor(){let e=this.panSizer?.()?.getBoundingClientRect?.(),t=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),n=this.cssScale;if(!e||!t||!(e.width>0&&e.height>0)||!(t.width>0&&t.height>0)||!(n>0)){this.settledSvgPinchAnchor=null;return!1}return this.settledSvgPinchAnchor={sourceLeft:t.left,sourceTop:t.top,sizerLeft:e.left,sizerTop:e.top,scale:n},!0}settledSvgPinchSourceRect(){let e=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),t=this.panSizer?.()?.getBoundingClientRect?.(),n=this.settledSvgPinchAnchor,r=this.cssScale;if(!e||!t||!n||!(r>0)||!(n.scale>0))return e;let s=r/n.scale;return{left:t.left+(n.sourceLeft-n.sizerLeft)*s,top:t.top+(n.sourceTop-n.sizerTop)*s,width:e.width,height:e.height}}';
bundle = `${bundle.slice(0, end)}${anchorMethods}${bundle.slice(end)}`;
new vm.Script(bundle, { filename: file });
fs.writeFileSync(file, bundle);
console.log("Restored settled SVG pinch anchor helpers");
