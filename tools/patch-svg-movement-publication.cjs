const fs = require("node:fs");
const vm = require("node:vm");

const file = "main.js";
let bundle = fs.readFileSync(file, "utf8");

const movementStart = bundle.indexOf("writeViewportPan(e=!1)");
const movementEnd = movementStart >= 0 ? bundle.indexOf("paperRewrapY=0", movementStart) : -1;
if (movementStart < 0 || movementEnd < 0) {
  throw new Error("viewport movement writer could not be located");
}

const method = bundle.slice(movementStart, movementEnd);
const oldTail = "this.writePaperPan(),this.writeInkLayerTransform()}";
const tailCount = method.split(oldTail).length - 1;
if (tailCount !== 1) {
  throw new Error(`viewport movement writer: expected one transform tail, found ${tailCount}`);
}

const updatedMethod = method.replace(
  oldTail,
  'this.writePaperPan(),this.writeInkLayerTransform(),this.publishSettledSvgMovement("viewport")}',
);
const helper = 'publishSettledSvgMovement(e="viewport"){let t=this.committedSvgRenderer;if(t?.getMode?.()!=="svg"||!this.settledSvgPresentationReady?.())return!1;this.settledSvgGeometryCache=null;return this.updateSettledSvgPresentation(e)}';

bundle = `${bundle.slice(0, movementStart)}${helper}${updatedMethod}${bundle.slice(movementEnd)}`;

new vm.Script(bundle, { filename: file });
fs.writeFileSync(file, bundle);
console.log("Published settled SVG after every viewport movement transform");
