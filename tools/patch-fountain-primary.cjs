const fs = require("node:fs");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");
const before = 'this.activeStyle.inkStyle=this.settings.fountainProfile==="v1"&&s==="pen"&&t.pointerType==="pen"?"fountain-v1":s==="pen"&&t.pointerType==="pen"?"fountain-v2":void 0,this.activeStyle.pressureSensitivity=this.settings.pressureSensitivity?"on":"off",this.activeStyle.inkSmoothing=this.settings.inkSmoothing?"on":"off",t.pointerType';
const after = 'this.activeStyle.inkStyle=HandwritingFountainInk.isFountain(j)&&s==="pen"&&t.pointerType==="pen"?j.inkStyle:void 0,this.activeStyle.pressureSensitivity=j.pressureSensitivity==="off"?"off":"on",this.activeStyle.inkSmoothing=j.inkSmoothing==="off"?"off":"on",t.pointerType';
const count = bundle.split(before).length - 1;
if (count !== 1) throw new Error(`primary style capture: expected 1 match, found ${count}`);
bundle = bundle.replace(before, after);
new Function(bundle);
fs.writeFileSync(path, bundle);
console.log("Updated main.js to capture inline pen options from runtime style");
