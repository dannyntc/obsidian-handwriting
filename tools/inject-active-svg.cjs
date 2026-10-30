const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
const sourcePath = "tools/active-svg-source.js";
const source = fs.readFileSync(sourcePath, "utf8").trim();
const bundle = fs.readFileSync(bundlePath, "utf8");
const fountainEnd = "/* END HANDWRITING FOUNTAIN INK */";
const marker = "/* BEGIN HANDWRITING ACTIVE SVG */";
const endMarker = "/* END HANDWRITING ACTIVE SVG */";

const begin = bundle.indexOf(marker);
const end = bundle.indexOf(endMarker);
if ((begin >= 0) !== (end >= 0)) throw new Error("active SVG bundle markers are unbalanced");

let next;
if (begin >= 0) {
  const after = end + endMarker.length;
  next = `${bundle.slice(0, begin)}${marker}\n${source}\n${endMarker}${bundle.slice(after)}`;
} else {
  const anchor = bundle.indexOf(fountainEnd);
  if (anchor < 0) throw new Error("fountain source must be injected before active SVG source");
  const after = anchor + fountainEnd.length;
  next = `${bundle.slice(0, after)}\n${marker}\n${source}\n${endMarker}${bundle.slice(after)}`;
}

new vm.Script(next, { filename: bundlePath });

if (process.argv.includes("--check")) {
  if (!next.includes(marker) || !next.includes(endMarker) || !next.includes("HandwritingActiveSvgStroke")) {
    throw new Error("active SVG source is not present in the generated bundle");
  }
  console.log("PASS: active SVG bundle injection is valid");
} else {
  fs.writeFileSync(bundlePath, next);
  console.log("Updated main.js with active SVG stroke presenter");
}
