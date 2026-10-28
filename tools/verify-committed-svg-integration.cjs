const fs = require("node:fs");

const main = fs.readFileSync("main.js", "utf8");
const source = fs.readFileSync("tools/committed-svg-source.js", "utf8").trim();
const settledSource = fs.readFileSync("tools/settled-svg-presentation-source.js", "utf8").trim();

const required = [
  "HandwritingCommittedSvg",
  "handwriting-committed-svg-pen",
  "handwriting-committed-svg-highlighter",
  "completedInkRenderer",
  "setMode(t)",
  "t.reconcile(e??this.committedSvgStrokes())",
  "upsertCommitted",
  "reconcileCommittedSvg(e,o={})",
  "this.reconcileCommittedSvg(r,{priority:!0})",
  "committedSvgLastGeneration",
  "lastSvgHandoffMs",
  "completedInkRenderer",
  "HandwritingSettledSvgPresentation",
  "handwriting-settled-svg-host",
  "settledSvgPresentation=null",
  "HandwritingSettledSvgPresentation.create",
  'presentationRoot:this.view.dom.closest(".markdown-source-view")',
  "layerRoot",
  "scrollElement:n",
  "t.update({sourceRect:r,clipRect:s,presentationRootRect:a,viewBox:l})",
  "applySettledSvgPresentation",
  "exitSettledSvgPresentation",
  "settledSvgPresentation?.dispose",
  'settledSvgPresentationMode="permanent"',
  "settledSvgPresentationFallbackNoticed",
  "svg-fallback",
];
const failures = required.filter(fragment => !main.includes(fragment));
if (failures.length) throw new Error(`committed SVG integration is missing: ${failures.join(", ")}`);
if (!main.includes(source)) throw new Error("committed SVG source is not injected verbatim");
if (!main.includes(settledSource)) throw new Error("settled SVG presentation source is not injected verbatim");
if (main.includes('externalParent:t.ownerDocument.body')) throw new Error("settled SVG presentation still mounts on document.body");
if (main.includes("settledSvgPresentationObserver")) throw new Error("settled SVG presentation still owns a resize observer loop");
if (main.includes("settledSvgPresentation.enter")) throw new Error("settled SVG presentation still reparents layers on settle");
if (main.includes('repaint(){this.exitSettledSvgPresentation("repaint")')) {
  throw new Error("ordinary repaint still hides the settled SVG host");
}
if (main.includes('settledSvgPresentation:"editor"') || main.includes('settledSvgPresentation:e?.')) {
  throw new Error("legacy settled SVG setting is still active");
}
if (main.includes("j.settledSvgPresentation=") || main.includes("applySettledSvgPresentation?.")) {
  throw new Error("legacy settled SVG runtime setting is still active");
}
if (main.includes("Settled SVG presentation")) throw new Error("legacy settled SVG setting is still shown");
if (!main.includes("/* BEGIN HANDWRITING COMMITTED SVG */") || !main.includes("/* END HANDWRITING COMMITTED SVG */")) {
  throw new Error("committed SVG injection markers are missing");
}
if (!main.includes("/* BEGIN HANDWRITING SETTLED SVG PRESENTATION */") || !main.includes("/* END HANDWRITING SETTLED SVG PRESENTATION */")) {
  throw new Error("settled SVG presentation injection markers are missing");
}

console.log("PASS: committed SVG integration");
