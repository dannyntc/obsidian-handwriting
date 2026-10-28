const fs = require("node:fs");
const vm = require("node:vm");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");
const before = "this.committedCtx.setTransform(d,0,0,d,0,0),this.committedBacking=d,this.updateCommittedSvgViewport(),";
const after = "this.committedCtx.setTransform(d,0,0,d,0,0),this.committedBacking=d,this.updateCommittedSvgViewport?.(),";
const count = bundle.split(before).length - 1;
if (count !== 1) throw new Error(`expected one SVG resize call, found ${count}`);
bundle = bundle.replace(before, after);
new vm.Script(bundle, { filename: path });
fs.writeFileSync(path, bundle);
console.log("Updated SVG resize call for isolated regression harnesses");
