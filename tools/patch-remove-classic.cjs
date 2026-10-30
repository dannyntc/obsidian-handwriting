const fs = require("node:fs");
const vm = require("node:vm");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceIfPresent(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count === 0) {
    if (bundle.includes(after)) return;
    throw new Error(`${label}: expected one current or already-patched match`);
  }
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceIfPresent(
  "Classic settings row",
  '},{name:"Pen style",desc:"Choose the appearance of new pen strokes. Existing handwriting keeps its saved style.",control:{type:"dropdown",key:"penStyle",options:{fountain:"Fountain pen",classic:"Classic"}}},{name:"Fountain pressure profile",desc:"Choose the pressure response for new Fountain pen strokes. Existing handwriting keeps its saved profile.",control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"},disabled:()=>this.plugin.settings.penStyle==="classic"}},{name:"Completed handwriting",desc:"Choose how saved handwriting is presented in Markdown notes. SVG is sharper; Canvas is the compatibility fallback.",control:{type:"dropdown",key:"completedInkRenderer",options:{svg:"SVG (sharp)",canvas:"Canvas (compatibility)"}}}',
  '},{name:"Fountain pressure profile",desc:"Choose the pressure response for new Fountain pen strokes. Existing handwriting keeps its saved profile.",control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"}}},{name:"Completed handwriting",desc:"Choose how saved handwriting is presented in Markdown notes. SVG is sharper; Canvas is the compatibility fallback.",control:{type:"dropdown",key:"completedInkRenderer",options:{svg:"SVG (sharp)",canvas:"Canvas (compatibility)"}}}',
);

replaceIfPresent(
  "Classic settings handler",
  'case"penStyle":r.penStyle=o==="classic"?"classic":"fountain",this.plugin.applyRuntimeSettings(),this.rerender();break;case"fountainProfile":r.fountainProfile=o==="v1"?"v1":"v2",this.plugin.applyRuntimeSettings(),this.rerender();break;case"completedInkRenderer":',
  'case"fountainProfile":r.fountainProfile=o==="v1"?"v1":"v2",this.plugin.applyRuntimeSettings(),this.rerender();break;case"completedInkRenderer":',
);

replaceIfPresent(
  "Classic runtime gate",
  'j.inkStyle=this.settings.penStyle==="fountain"?(this.settings.fountainProfile==="v1"?"fountain-v1":"fountain-v2"):void 0,',
  'j.inkStyle=this.settings.fountainProfile==="v1"?"fountain-v1":"fountain-v2",',
);

if (
  bundle.includes('name:"Pen style"') ||
  bundle.includes('key:"penStyle"') ||
  bundle.includes('case"penStyle":') ||
  bundle.includes('disabled:()=>this.plugin.settings.penStyle==="classic"')
) {
  throw new Error("Classic remains exposed in the generated settings UI");
}
if (!bundle.includes('j.inkStyle=this.settings.fountainProfile==="v1"?"fountain-v1":"fountain-v2"')) {
  throw new Error("new strokes are not driven solely by the Fountain pressure profile");
}
if (!bundle.includes('penStyle:e?.penStyle==="classic"?"classic":"fountain"')) {
  throw new Error("legacy penStyle settings are no longer accepted");
}

new vm.Script(bundle, { filename: path });
fs.writeFileSync(path, bundle);
console.log("Updated main.js to remove the Classic handwriting option");
