const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
const sourcePath = "tools/fountain-ink-source.js";
const source = fs.readFileSync(sourcePath, "utf8").trim();
const bundle = fs.readFileSync(bundlePath, "utf8");
const anchor = "var HandwritingPortableSnapshots=(()=>{";
const marker = "/* BEGIN HANDWRITING FOUNTAIN INK */";
const endMarker = "/* END HANDWRITING FOUNTAIN INK */";

const begin = bundle.indexOf(marker);
const end = bundle.indexOf(endMarker);
let next;
if ((begin >= 0) !== (end >= 0)) throw new Error("fountain bundle markers are unbalanced");
if (begin >= 0) {
  const after = end + endMarker.length;
  next = `${bundle.slice(0, begin)}${marker}\n${source}\n${endMarker}${bundle.slice(after)}`;
} else {
  const count = bundle.split(anchor).length - 1;
  if (count !== 1) throw new Error(`expected one fountain injection anchor, found ${count}`);
  next = bundle.replace(anchor, `${marker}\n${source}\n${endMarker}\n${anchor}`);
}

new vm.Script(next, { filename: bundlePath });

if (process.argv.includes("--check")) {
  if (!next.includes(marker) || !next.includes(endMarker) || !next.includes("HandwritingFountainInk")) {
    throw new Error("fountain source is not present in the generated bundle");
  }
  console.log("PASS: fountain bundle injection is valid");
} else {
  fs.writeFileSync(bundlePath, next);
  console.log("Updated main.js with fountain ink renderer");
}
