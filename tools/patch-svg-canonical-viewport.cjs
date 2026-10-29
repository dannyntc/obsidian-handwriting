const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
let bundle = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
}

function replaceRange(label, startNeedle, endNeedle, replacement) {
  const start = bundle.indexOf(startNeedle);
  const end = start >= 0 ? bundle.indexOf(endNeedle, start + startNeedle.length) : -1;
  if (start < 0 || end < 0) throw new Error(`${label}: method range not found`);
  bundle = `${bundle.slice(0, start)}${replacement}${bundle.slice(end)}`;
}

const presentationMethod = `updateSettledSvgPresentation(e="update"){let t=this.settledSvgPresentation,n=this.committedSvgRenderer;if(!t||!n||n.report().mode!=="svg"){t?.hide(e);return!1}this.settledSvgPresentationReads++;let r=this.committedCanvas?.getBoundingClientRect?.()??this.inkLayer?.getBoundingClientRect?.(),s=this.settledSvgGeometry?.(),o=s?.clipRect,a=s?.rootRect,l=n.getViewportViewBox?.(),c=String(l??"").trim().split(/[\\s,]+/).map(Number);if(c.length!==4||!c.every(Number.isFinite)||c[2]<=0||c[3]<=0){t.hide("viewport-not-ready");return!1}let h=t.report?.().generation??this.settledSvgPresentationGeneration,d=t.update({sourceRect:r,clipRect:o,presentationRootRect:a,viewBox:l});if(!d){let u=t.report?.().reason;if(u==="unsupported-root-transform"||u==="invalid-viewbox"){this.settledSvgPresentation?.hide("svg-fallback"),this.committedSvgFailed=!0,n.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentationFallbackNoticed||(this.settledSvgPresentationFallbackNoticed=!0,new W.Notice("Handwriting: SVG presentation was unavailable, so Canvas is being used")),this.scheduleRepaint("svg-fallback")}return!1}let u=t.report?.().generation??h;return u!==h&&this.settledSvgPresentationMutations++,this.settledSvgPresentationGeneration=u,!0}`;
replaceRange(
  "canonical SVG viewport",
  "updateSettledSvgPresentation(e=\"update\")",
  "scheduleSettledSvgPresentation(e=\"update\")",
  presentationMethod,
);

replaceOnce(
  "fresh SVG geometry per frame",
  "flushSettledSvgPresentation(){let e=this.settledSvgPresentationPending;",
  "flushSettledSvgPresentation(){this.settledSvgGeometryCache=null;let e=this.settledSvgPresentationPending;",
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js with canonical SVG viewport presentation");
