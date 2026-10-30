const fs = require("node:fs");
const vm = require("node:vm");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count === 0 && bundle.includes(after)) return;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "profile default",
  'penStyle:"fountain",completedInkRenderer:"svg",',
  'penStyle:"fountain",fountainProfile:"v2",completedInkRenderer:"svg",',
);
replaceOnce(
  "profile parser",
  'penStyle:e?.penStyle==="classic"?"classic":"fountain",completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",',
  'penStyle:e?.penStyle==="classic"?"classic":"fountain",fountainProfile:e?.fountainProfile==="v1"?"v1":"v2",completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",',
);
replaceOnce(
  "runtime profile selection",
  'j.inkStyle=this.settings.penStyle==="fountain"?"fountain-v2":void 0,',
  'j.inkStyle=this.settings.fountainProfile==="v1"?"fountain-v1":"fountain-v2",',
);
replaceOnce(
  "primary profile selection",
  'this.activeStyle.inkStyle=j.inkStyle==="fountain-v2"&&s==="pen"&&t.pointerType==="pen"?"fountain-v2":void 0',
  'this.activeStyle.inkStyle=HandwritingFountainInk.isFountain(j)&&s==="pen"&&t.pointerType==="pen"?j.inkStyle:void 0',
);
replaceOnce(
  "PDF profile selection",
  'this.strokeStyle.inkStyle=u==="pen"&&!this.mouseStroke&&j.inkStyle==="fountain-v2"?"fountain-v2":void 0',
  'this.strokeStyle.inkStyle=u==="pen"&&!this.mouseStroke&&HandwritingFountainInk.isFountain(j)?j.inkStyle:void 0',
);
replaceOnce(
  "slide profile selection",
  'inkStyle:e.tool==="pen"&&j.inkStyle==="fountain-v2"?"fountain-v2":void 0',
  'inkStyle:e.tool==="pen"&&HandwritingFountainInk.isFountain(j)?j.inkStyle:void 0',
);
replaceOnce(
  "profile setting row",
  '},{name:"Pen style",desc:"Choose the appearance of new pen strokes. Existing handwriting keeps its saved style.",control:{type:"dropdown",key:"penStyle",options:{fountain:"Fountain pen",classic:"Classic"}}},{name:"Completed handwriting"',
  '},{name:"Fountain pressure profile",desc:"Choose the pressure response for new Fountain pen strokes. Existing handwriting keeps its saved profile.",control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"}}},{name:"Completed handwriting"',
);
replaceOnce(
  "profile setting handler",
  'case"penStyle":r.penStyle=o==="classic"?"classic":"fountain",this.plugin.applyRuntimeSettings(),this.rerender();break;case"completedInkRenderer":',
  'case"fountainProfile":r.fountainProfile=o==="v1"?"v1":"v2",this.plugin.applyRuntimeSettings(),this.rerender();break;case"completedInkRenderer":',
);

new vm.Script(bundle, { filename: path });
fs.writeFileSync(path, bundle);
console.log("Updated main.js with the Fountain pressure profile setting");
