const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
const sourcePath = "tools/portable-snapshot-source.js";
let bundle = fs.readFileSync(bundlePath, "utf8");
const source = fs.readFileSync(sourcePath, "utf8").trim();

const removeDelimited = (startMarker, endMarker, label) => {
  const start = bundle.indexOf(startMarker);
  const end = start >= 0 ? bundle.indexOf(endMarker, start) : -1;
  if (start < 0 && end < 0) return;
  if (start < 0 || end < 0) throw new Error(`${label}: markers are unbalanced`);
  bundle = `${bundle.slice(0, start)}${bundle.slice(end + endMarker.length)}`;
};

removeDelimited("/* BEGIN HANDWRITING LASSO TRACE */", "/* END HANDWRITING LASSO TRACE */", "lasso trace helper");

const removeOnce = (fragment, label) => {
  const count = bundle.split(fragment).length - 1;
  if (count === 0) return;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(fragment, "");
};

removeOnce(
  "lassoTrace=HandwritingLassoTrace.create();lassoTraceMoved=!1;lassoTraceFrame=0;lassoTraceRaf=0;lassoTraceTimer=0;",
  "lasso trace fields",
);

const methodsStart = bundle.indexOf("lassoTraceSnapshot(e){");
const methodsEnd = methodsStart >= 0 ? bundle.indexOf("lassoDown(e){", methodsStart) : -1;
if (methodsStart >= 0 && methodsEnd < 0) throw new Error("lasso trace methods are incomplete");
if (methodsStart >= 0) bundle = `${bundle.slice(0, methodsStart)}${bundle.slice(methodsEnd)}`;

for (const fragment of [
  'this.beginLassoTrace("start"),',
  'this.lassoTraceMoved||(this.lassoTraceMoved=!0,this.lassoTraceRecord("move"));',
  ',this.finishLassoTrace("release")',
  ',this.lassoTraceRecord?.("presentation-hide")',
  'this.lassoTraceRecord?.("presentation-hide"),',
  'this.lassoTraceRecord?.("presentation-update"),',
  ',this.lassoTraceRecord?.("presentation-schedule")',
  'this.lassoTraceRecord?.("resize"),',
  'this.cancelLassoTraceFollowup(),',
]) {
  bundle = bundle.replaceAll(fragment, "");
}

const tracedAbandon = 'strokeAbandoned(){let e=this.bandSyncDeferred,t=this.mode==="lasso"||this.lassoActive||!!this.dragTotal;wn(this.mobileTools,this.noteZoomControls),this.resetGestureState(),t&&this.finishLassoTrace("cancel"),this.contactEndedWithoutLift(e)}';
const plainAbandon = 'strokeAbandoned(){let e=this.bandSyncDeferred;wn(this.mobileTools,this.noteZoomControls),this.resetGestureState(),this.contactEndedWithoutLift(e)}';
if (bundle.includes(tracedAbandon)) bundle = bundle.replace(tracedAbandon, plainAbandon);

const removeCommand = (id, label) => {
  const needle = id.startsWith("show-last-lasso")
    ? `this.settings.devDiagnostics&&this.addCommand({id:"${id}"`
    : `this.addCommand({id:"${id}"`;
  const start = bundle.indexOf(needle);
  if (start < 0) return;
  const end = bundle.indexOf("}}),", start);
  if (end < 0) throw new Error(`${label}: command end not found`);
  bundle = `${bundle.slice(0, start)}${bundle.slice(end + 4)}`;
};

while (bundle.includes('this.settings.devDiagnostics&&this.addCommand({id:"show-last-lasso-trace"')) {
  removeCommand("show-last-lasso-trace", "lasso trace command");
}
while (bundle.includes('this.addCommand({id:"show-last-portable-snapshot-error"')) {
  removeCommand("show-last-portable-snapshot-error", "snapshot error command");
}

const helperStart = bundle.indexOf("var HandwritingPortableSnapshots=(()=>{");
const helperEnd = helperStart >= 0 ? bundle.indexOf("\n\nvar Ry=", helperStart) : -1;
if (helperStart < 0 || helperEnd < 0) throw new Error("portable snapshot helper boundaries not found");
bundle = `${bundle.slice(0, helperStart)}${source}${bundle.slice(helperEnd)}`;

const visibilityBefore = 'this.exitSettledSvgPresentation("input");if(this.selection.clear()';
const visibilityAfter = 'if(n!=="ink")this.exitSettledSvgPresentation("input");if(this.selection.clear()';
if (bundle.includes(visibilityBefore)) bundle = bundle.replace(visibilityBefore, visibilityAfter);
if (!bundle.includes(visibilityAfter)) throw new Error("writing visibility guard is missing");

new vm.Script(bundle, { filename: bundlePath });
const forbidden = [
  "HandwritingLassoTrace",
  "lassoTraceSnapshot(e)",
  'id:"show-last-lasso-trace"',
  'id:"show-last-portable-snapshot-error"',
  "errorReport()",
];
const leftovers = forbidden.filter(fragment => bundle.includes(fragment));
if (leftovers.length) throw new Error(`diagnostic cleanup left references: ${leftovers.join(", ")}`);

if (process.argv.includes("--check")) {
  console.log("PASS: diagnostic cleanup bundle is valid");
} else {
  fs.writeFileSync(bundlePath, bundle);
  console.log("Removed resolved-issue diagnostics and retained writing visibility");
}
