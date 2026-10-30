const fs = require("node:fs");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "fountain profile setting row",
  '},{name:"Ink smoothing",desc:"Smooth and taper strokes. Global setting. Default on.",aliases:["shaping","speed"],control:{type:"toggle",key:"inkSmoothing",disabled:()=>this.plugin.settings.booxMode}},{name:"Pen reticle"',
  '},{name:"Ink smoothing",desc:"Smooth and taper strokes. Global setting. Default on.",aliases:["shaping","speed"],control:{type:"toggle",key:"inkSmoothing",disabled:()=>this.plugin.settings.booxMode}},{name:"Fountain pressure profile",desc:"Choose the pressure response for new Fountain pen strokes. Existing handwriting keeps its saved profile.",control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"}}},{name:"Pen reticle"',
);
replaceOnce(
  "fountain profile setting handler",
  'case"inkSmoothing":r.inkSmoothing=s,this.plugin.applyBooxMode(),$n(),Rs();break;case"booxMode":',
  'case"inkSmoothing":r.inkSmoothing=s,this.plugin.applyBooxMode(),$n(),Rs();break;case"fountainProfile":r.fountainProfile=o==="v1"?"v1":"v2",this.plugin.applyRuntimeSettings(),this.rerender();break;case"booxMode":',
);

new Function(bundle);
fs.writeFileSync(path, bundle);
console.log("Updated main.js with the pen style setting");
