const fs = require("node:fs");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceAll(label, before, after, expected) {
  const count = bundle.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`);
  bundle = bundle.split(before).join(after);
}

replaceAll(
  "inline and slide builder options",
  "this.builder.inkStyle=this.activeStyle.inkStyle,this.builder.start",
  "this.builder.inkStyle=this.activeStyle.inkStyle,this.builder.pressureSensitivity=this.activeStyle.pressureSensitivity,this.builder.inkSmoothing=this.activeStyle.inkSmoothing,this.builder.start",
  2,
);
replaceAll(
  "PDF builder options",
  "this.builder.inkStyle=this.strokeStyle.inkStyle,this.predReal=[]",
  "this.builder.inkStyle=this.strokeStyle.inkStyle,this.builder.pressureSensitivity=this.strokeStyle.pressureSensitivity,this.builder.inkSmoothing=this.strokeStyle.inkSmoothing,this.predReal=[]",
  1,
);

new Function(bundle);
fs.writeFileSync(path, bundle);
console.log("Updated main.js to persist per-stroke pressure options");
