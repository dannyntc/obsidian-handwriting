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
  "completedInkRenderer",
  "HandwritingSettledSvgPresentation",
  "handwriting-settled-svg-host",
  "settledSvgPresentation=null",
  "settledSvgPresentationObserver=null",
  "HandwritingSettledSvgPresentation.create",
  'presentationRoot:this.view.dom.closest(".markdown-source-view")',
  "settledSvgPresentationObserver?.observe",
  "settledSvgPresentationObserver?.disconnect",
  "applySettledSvgPresentation",
  "scheduleSettledSvgPresentation",
  "exitSettledSvgPresentation",
  "settledSvgPresentation?.dispose",
  'settledSvgPresentation:"editor"',
];
const failures = required.filter(fragment => !main.includes(fragment));
if (failures.length) throw new Error(`committed SVG integration is missing: ${failures.join(", ")}`);
if (!main.includes(source)) throw new Error("committed SVG source is not injected verbatim");
if (!main.includes(settledSource)) throw new Error("settled SVG presentation source is not injected verbatim");
if (main.includes('externalParent:t.ownerDocument.body')) throw new Error("settled SVG presentation still mounts on document.body");
if (!main.includes("/* BEGIN HANDWRITING COMMITTED SVG */") || !main.includes("/* END HANDWRITING COMMITTED SVG */")) {
  throw new Error("committed SVG injection markers are missing");
}
if (!main.includes("/* BEGIN HANDWRITING SETTLED SVG PRESENTATION */") || !main.includes("/* END HANDWRITING SETTLED SVG PRESENTATION */")) {
  throw new Error("settled SVG presentation injection markers are missing");
}

console.log("PASS: committed SVG integration");
