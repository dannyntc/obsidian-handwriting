const fs = require("node:fs");
const vm = require("node:vm");

const path = "main.js";
const before = 'handleResize(){this.exitSettledSvgPresentation("resize");if(this.deferPinchRaster())return;';
const after = 'handleResize(){this.exitSettledSvgPresentation?.("resize");if(this.deferPinchRaster())return;';
const bundle = fs.readFileSync(path, "utf8");
const count = bundle.split(before).length - 1;
if (count !== 1) throw new Error(`expected one resize hook, found ${count}`);
const next = bundle.replace(before, after);
new vm.Script(next, { filename: path });
fs.writeFileSync(path, next);
console.log("Updated main.js resize compatibility hook");
