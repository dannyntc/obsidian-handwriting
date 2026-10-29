const fs = require("node:fs");
const vm = require("node:vm");

const file = "main.js";
let bundle = fs.readFileSync(file, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count === 0 && bundle.includes(after)) return;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "lasso-safe pen-down preparation",
  'beforePenDown(){this.exitSettledSvgPresentation("input"),this.endWheelZoomRun(),',
  "beforePenDown(){this.endWheelZoomRun(),",
);

replaceOnce(
  "deferred input presentation hide",
  'this.mode="lasso",this.lassoDown(e);return}}if(this.selection.clear()&&this.redrawSelectionUI(),r){',
  'this.mode="lasso",this.lassoDown(e);return}}this.exitSettledSvgPresentation("input");if(this.selection.clear()&&this.redrawSelectionUI(),r){',
);

replaceOnce(
  "lasso release presentation refresh",
  'if(this.mode==="lasso"){this.mode="ink",this.hideLassoCursor(),this.lassoUp(),this.updateExtent(!0);return}',
  'if(this.mode==="lasso"){this.mode="ink",this.hideLassoCursor(),this.lassoUp(),this.updateExtent(!0),this.scheduleSettledSvgPresentation("lasso"),this.scheduleRepaint("lasso");return}',
);

replaceOnce(
  "lasso presentation readiness",
  'settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.getMode?.()==="svg"&&!this.router?.isStroking&&this.builder===null&&this.mode==="ink"}',
  'settledSvgPresentationReady(){return!!this.container&&!this.retiring&&this.committedSvgRenderer?.getMode?.()==="svg"&&(!this.router?.isStroking||this.mode==="lasso")&&this.builder===null&&(this.mode==="ink"||this.mode==="lasso")}',
);

new vm.Script(bundle, { filename: file });
fs.writeFileSync(file, bundle);
console.log("Kept settled SVG visible through lasso and queued its release refresh");
