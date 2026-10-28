const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
let bundle = fs.readFileSync(bundlePath, "utf8");

const replaceOnce = (oldText, newText, label) => {
  const count = bundle.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(oldText, newText);
};

replaceOnce(
  'completedInkRenderer:"svg",settledSvgPresentation:"editor",inkAdaptsToTheme:',
  'completedInkRenderer:"svg",inkAdaptsToTheme:',
  "default settled SVG setting",
);
replaceOnce(
  'completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",settledSvgPresentation:e?.settledSvgPresentation==="external"?"external":"editor",inkAdaptsToTheme:',
  'completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",inkAdaptsToTheme:',
  "parsed settled SVG setting",
);
replaceOnce(
  'j.completedInkRenderer=this.settings.completedInkRenderer==="canvas"?"canvas":"svg",j.settledSvgPresentation=this.settings.settledSvgPresentation==="external"?"external":"editor",_o(this.settings.penTools),',
  'j.completedInkRenderer=this.settings.completedInkRenderer==="canvas"?"canvas":"svg",_o(this.settings.penTools),',
  "runtime settled SVG setting",
);
replaceOnce(
  ',B.forEach(e=>e.applyCompletedInkRenderer?.(this.settings.completedInkRenderer)),B.forEach(e=>e.applySettledSvgPresentation?.(this.settings.settledSvgPresentation))}',
  ',B.forEach(e=>e.applyCompletedInkRenderer?.(this.settings.completedInkRenderer))}',
  "runtime settled SVG propagation",
);
replaceOnce(
  '{name:"Settled SVG presentation",desc:"Developer experiment for completed SVG ink. Editor keeps the original layer; External moves settled ink outside the scaled editor for sharpness testing.",control:{type:"dropdown",key:"settledSvgPresentation",options:{editor:"Editor (default)",external:"External (experiment)"}}},',
  '',
  "settled SVG settings row",
);
replaceOnce(
  'case"settledSvgPresentation":r.settledSvgPresentation=o==="external"?"external":"editor",this.plugin.applyRuntimeSettings(),this.rerender();break;',
  '',
  "settled SVG settings control",
);

if (bundle.includes('settledSvgPresentation:"editor"') || bundle.includes('settledSvgPresentation:e?.')) {
  throw new Error("legacy settled SVG setting remains in the bundle");
}
if (bundle.includes("j.settledSvgPresentation=") || bundle.includes("applySettledSvgPresentation?.")) {
  throw new Error("legacy settled SVG runtime remains in the bundle");
}
if (bundle.includes("Settled SVG presentation")) throw new Error("legacy settled SVG settings row remains in the bundle");
new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js to make permanent SVG presentation unconditional");
