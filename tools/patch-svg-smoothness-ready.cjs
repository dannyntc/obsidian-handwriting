const fs = require("node:fs");
const vm = require("node:vm");

const file = "main.js";
let bundle = fs.readFileSync(file, "utf8");
const before = 'this.committedSvgRenderer?.getMode?.()==="svg"&&!this.pinchPreview&&!this.router?.isStroking';
const after = 'this.committedSvgRenderer?.getMode?.()==="svg"&&!this.router?.isStroking';
const count = bundle.split(before).length - 1;
if (count !== 1) throw new Error(`settled SVG pinch readiness: expected one match, found ${count}`);
bundle = bundle.replace(before, after);
new vm.Script(bundle, { filename: file });
fs.writeFileSync(file, bundle);
console.log("Enabled settled SVG publication during pinch preview");
