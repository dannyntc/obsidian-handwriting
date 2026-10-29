const fs = require("fs");

const file = "main.js";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(label, from, to) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one match, found ${count}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  "unmount pinch reference release",
  "this.pinchPending=null,this.restoreViewportLayout()",
  "this.pinchPending=null,this.settledSvgPinchAnchor=null,this.restoreViewportLayout()",
);

replaceOnce(
  "note switch pinch reference release",
  "this.pinchPending=null,this.pinchAnchor=null,this.pinchRefScale=null,this.view.scrollDOM.scrollLeft=0",
  "this.pinchPending=null,this.settledSvgPinchAnchor=null,this.pinchAnchor=null,this.pinchRefScale=null,this.view.scrollDOM.scrollLeft=0",
);

fs.writeFileSync(file, source);
console.log("Updated main.js to release the settled SVG pinch anchor on lifecycle resets");
