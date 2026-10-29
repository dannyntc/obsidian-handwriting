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
  "SVG mode activation",
  'applyCompletedInkRenderer(e){if(!this.committedSvgRenderer)return;this.exitSettledSvgPresentation("renderer");let t=e==="canvas"?"canvas":"svg";this.committedSvgFailed=!1,this.committedSvgLastGeneration=-1,this.committedSvgLastPath=null,this.settledSvgPresentationFallbackNoticed=!1,this.committedSvgRenderer.setMode(t);let n=t==="svg"?"hidden":"visible";this.committedCanvas?.setCssStyles({visibility:n}),this.highlightCanvas?.setCssStyles({visibility:n}),t==="svg"?(this.reconcileCommittedSvg(),this.scheduleSettledSvgPresentation("renderer")):this.scheduleRepaint("renderer")}',
  'applyCompletedInkRenderer(e){if(!this.committedSvgRenderer)return;this.exitSettledSvgPresentation("renderer");let t=e==="canvas"?"canvas":"svg";this.committedSvgFailed=!1,this.committedSvgLastGeneration=-1,this.committedSvgLastPath=null,this.settledSvgPresentationFallbackNoticed=!1,this.committedSvgRenderer.setMode(t);let n=t==="svg"?"hidden":"visible";this.committedCanvas?.setCssStyles({visibility:n}),this.highlightCanvas?.setCssStyles({visibility:n}),this.scheduleRepaint("renderer")}',
);

replaceOnce(
  "SVG load cache invalidation",
  "n&&this.scheduleRepaint())}),`load inline ink for ${e}`)}",
  "n&&(this.committedSvgLastPath=null,this.committedSvgLastGeneration=-1,this.scheduleRepaint()))}),`load inline ink for ${e}`)}",
);

replaceOnce(
  "camera-safe SVG repaint",
  'repaint(){if(this.committedSvgRenderer?.report().mode==="svg"){this.reconcileCommittedSvg()}if(this.deferPinchRaster()){',
  'repaint(){if(this.deferPinchRaster()){',
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js for camera-safe SVG reopen rendering");
