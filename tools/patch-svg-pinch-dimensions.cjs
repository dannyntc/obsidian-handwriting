const fs = require("node:fs");
const vm = require("node:vm");

const file = "main.js";
let bundle = fs.readFileSync(file, "utf8");

const before = 'captureSettledSvgPinchAnchor(){let e=this.panSizer?.()?.getBoundingClientRect?.(),t=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),n=this.cssScale;if(!e||!t||!(e.width>0&&e.height>0)||!(t.width>0&&t.height>0)||!(n>0)){this.settledSvgPinchAnchor=null;return!1}return this.settledSvgPinchAnchor={sourceLeft:t.left,sourceTop:t.top,sizerLeft:e.left,sizerTop:e.top,scale:n},!0}settledSvgPinchSourceRect(){let e=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),t=this.panSizer?.()?.getBoundingClientRect?.(),n=this.settledSvgPinchAnchor,r=this.cssScale;if(!e||!t||!n||!(r>0)||!(n.scale>0))return e;let s=r/n.scale;return{left:t.left+(n.sourceLeft-n.sizerLeft)*s,top:t.top+(n.sourceTop-n.sizerTop)*s,width:e.width,height:e.height}}';
const after = 'captureSettledSvgPinchAnchor(){let e=this.panSizer?.()?.getBoundingClientRect?.(),t=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),n=this.cssScale;if(!e||!t||!(e.width>0&&e.height>0)||!(t.width>0&&t.height>0)||!(n>0)){this.settledSvgPinchAnchor=null;return!1}return this.settledSvgPinchAnchor={sourceLeft:t.left,sourceTop:t.top,sourceWidth:t.width,sourceHeight:t.height,sizerLeft:e.left,sizerTop:e.top,scale:n},!0}settledSvgPinchSourceRect(){let e=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),t=this.panSizer?.()?.getBoundingClientRect?.(),n=this.settledSvgPinchAnchor,r=this.cssScale;if(!e||!t||!n||!(r>0)||!(n.scale>0))return e;let s=r/n.scale;return{left:t.left+(n.sourceLeft-n.sizerLeft)*s,top:t.top+(n.sourceTop-n.sizerTop)*s,width:n.sourceWidth*s,height:n.sourceHeight*s}}';

const count = bundle.split(before).length - 1;
if (count !== 1) throw new Error(`settled SVG pinch dimensions: expected one match, found ${count}`);
bundle = bundle.replace(before, after);

new vm.Script(bundle, { filename: file });
fs.writeFileSync(file, bundle);
console.log("Updated settled SVG pinch source dimensions to use the captured scale reference");
