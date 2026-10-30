const fs = require("node:fs");

const main = fs.readFileSync("main.js", "utf8");
const readme = fs.readFileSync("README.md", "utf8");

const forbidden = [
  ['name:"Pen style"', "the Pen style setting row is still exposed"],
  ['key:"penStyle"', "the penStyle setting is still exposed as a UI control"],
  ['options:{fountain:"Fountain pen",classic:"Classic"}', "the Classic option is still exposed"],
  ['case"penStyle":', "the penStyle UI handler is still present"],
];
for (const [fragment, message] of forbidden) {
  if (main.includes(fragment)) throw new Error(message);
}

const profileRow =
  'name:"Fountain pressure profile",desc:"Choose the pressure response for new Fountain pen strokes. Existing handwriting keeps its saved profile.",control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"}}';
if (main.split(profileRow).length - 1 !== 1) {
  throw new Error("the Fountain pressure profile row is missing or duplicated");
}

if (!main.includes('j.inkStyle=this.settings.fountainProfile==="v1"?"fountain-v1":"fountain-v2"')) {
  throw new Error("new strokes are not driven solely by the Fountain pressure profile");
}

if (!main.includes('penStyle:e?.penStyle==="classic"?"classic":"fountain"')) {
  throw new Error("legacy penStyle settings are no longer accepted for compatibility");
}

if (!main.includes('if(HandwritingFountainInk.isFountain(t))return HandwritingFountainInk.drawCanvas')) {
  throw new Error("legacy non-Fountain strokes no longer retain their renderer fallback");
}

if (readme.includes("choose **Classic** under **Pen style**") || readme.includes("Classic rendering remains available")) {
  throw new Error("README still advertises Classic as a selectable option");
}

console.log("PASS: Classic removed from the UI while legacy handwriting remains compatible");
