const fs = require("node:fs");

const main = fs.readFileSync("main.js", "utf8");
const required = [
  'penStyle:"fountain",fountainProfile:"v2",completedInkRenderer:"svg"',
  'penStyle:e?.penStyle==="classic"?"classic":"fountain",fountainProfile:e?.fountainProfile==="v1"?"v1":"v2",completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg"',
  'j.inkStyle=this.settings.fountainProfile==="v1"?"fountain-v1":"fountain-v2"',
  'name:"Fountain pressure profile"',
  'control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"}}',
  'case"fountainProfile":r.fountainProfile=o==="v1"?"v1":"v2",this.plugin.applyRuntimeSettings(),this.rerender();break;',
  'this.activeStyle.inkStyle=HandwritingFountainInk.isFountain(j)&&s==="pen"&&t.pointerType==="pen"?j.inkStyle:void 0',
  'this.strokeStyle.inkStyle=u==="pen"&&!this.mouseStroke&&HandwritingFountainInk.isFountain(j)?j.inkStyle:void 0',
  'inkStyle:e.tool==="pen"&&HandwritingFountainInk.isFountain(j)?j.inkStyle:void 0',
];
for (const fragment of required) {
  if (!main.includes(fragment)) throw new Error(`fountain profile setting is missing: ${fragment}`);
}
if (main.split('name:"Fountain pressure profile"').length - 1 !== 1) {
  throw new Error("fountain profile setting row was duplicated");
}
if (main.split('case"fountainProfile":').length - 1 !== 1) {
  throw new Error("fountain profile setting handler was duplicated");
}
if (main.includes('name:"Pen style"') || main.includes('key:"penStyle"') || main.includes('case"penStyle":')) {
  throw new Error("Classic pen-style controls were not removed");
}

console.log("PASS: fountain profile setting, normalization, UI, and runtime propagation");
