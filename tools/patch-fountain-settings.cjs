const fs = require("node:fs");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "pen style setting row",
  '},{name:"Ink smoothing",desc:"Smooth and taper strokes. Global setting. Default on.",aliases:["shaping","speed"],control:{type:"toggle",key:"inkSmoothing",disabled:()=>this.plugin.settings.booxMode}},{name:"Pen reticle"',
  '},{name:"Ink smoothing",desc:"Smooth and taper strokes. Global setting. Default on.",aliases:["shaping","speed"],control:{type:"toggle",key:"inkSmoothing",disabled:()=>this.plugin.settings.booxMode}},{name:"Pen style",desc:"Choose the appearance of new pen strokes. Existing handwriting keeps its saved style.",control:{type:"dropdown",key:"penStyle",options:{fountain:"Fountain pen",classic:"Classic"}}},{name:"Pen reticle"',
);
replaceOnce(
  "pen style setting handler",
  'case"inkSmoothing":r.inkSmoothing=s,this.plugin.applyBooxMode(),$n(),Rs();break;case"booxMode":',
  'case"inkSmoothing":r.inkSmoothing=s,this.plugin.applyBooxMode(),$n(),Rs();break;case"penStyle":r.penStyle=o==="classic"?"classic":"fountain",this.plugin.applyRuntimeSettings(),this.rerender();break;case"booxMode":',
);

new Function(bundle);
fs.writeFileSync(path, bundle);
console.log("Updated main.js with the pen style setting");
