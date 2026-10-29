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
  "deferred settled SVG startup",
  'applySettledSvgPresentation(e){this.settledSvgPresentationMode="permanent",this.updateSettledSvgPresentation("setting")}',
  'applySettledSvgPresentation(e){this.settledSvgPresentationMode="permanent",this.scheduleRepaint("renderer")}',
);

replaceOnce(
  "pending settled SVG viewport",
  'let r=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.view.scrollDOM?.getBoundingClientRect?.(),o=this.view.dom?.closest?.(".markdown-source-view"),a=o?.getBoundingClientRect?.(),l=n.pen?.getAttribute?.("viewBox"),c=t.update({sourceRect:r,clipRect:s,presentationRootRect:a,viewBox:l});',
  'let r=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.view.scrollDOM?.getBoundingClientRect?.(),o=this.view.dom?.closest?.(".markdown-source-view"),a=o?.getBoundingClientRect?.(),l=n.pen?.getAttribute?.("viewBox"),c=String(l??"").trim().split(/[\\s,]+/).map(Number);if(c.length!==4||!c.every(Number.isFinite)||c[2]<=0||c[3]<=0){t.hide("viewport-not-ready");return!1}c=t.update({sourceRect:r,clipRect:s,presentationRootRect:a,viewBox:l});',
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js for safe SVG startup initialization");
