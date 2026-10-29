const fs = require("node:fs");
const vm = require("node:vm");

const file = "main.js";
let bundle = fs.readFileSync(file, "utf8");
const before = 'settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.getMode?.()==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}updateSettledSvgPresentation(e="update")';
const after = 'settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.getMode?.()==="svg"&&!this.pinchPreview&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}settledSvgGeometry(){let e=this.view?.scrollDOM,t=this.view?.dom?.closest?.(".markdown-source-view");if(!e||!t)return null;let n=this.settledSvgGeometryCache;if(n?.scrollElement===e&&n.root===t)return n;let r=e.getBoundingClientRect?.(),s=t.getBoundingClientRect?.();if(!r||!s||!(r.width>0&&r.height>0)||!(s.width>0&&s.height>0))return null;return this.settledSvgGeometryCache={scrollElement:e,root:t,clipRect:{left:r.left,top:r.top,width:r.width,height:r.height},rootRect:{left:s.left,top:s.top,width:s.width,height:s.height}}}updateSettledSvgPresentation(e="update")';
const count = bundle.split(before).length - 1;
if (count !== 1) throw new Error(`settled SVG geometry restore: expected one match, found ${count}`);
bundle = bundle.replace(before, after);
new vm.Script(bundle, { filename: file });
fs.writeFileSync(file, bundle);
console.log("Restored cached settled SVG geometry helper");
