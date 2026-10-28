const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
const sourcePath = "tools/settled-svg-presentation-source.js";
const source = fs.readFileSync(sourcePath, "utf8").trim();
const bundle = fs.readFileSync(bundlePath, "utf8");
const anchor = "/* END HANDWRITING COMMITTED SVG */";
const marker = "/* BEGIN HANDWRITING SETTLED SVG PRESENTATION */";
const endMarker = "/* END HANDWRITING SETTLED SVG PRESENTATION */";

const begin = bundle.indexOf(marker);
const end = bundle.indexOf(endMarker);
if ((begin >= 0) !== (end >= 0)) throw new Error("settled SVG presentation markers are unbalanced");

let next;
if (begin >= 0) {
  const after = end + endMarker.length;
  next = `${bundle.slice(0, begin)}${marker}\n${source}\n${endMarker}${bundle.slice(after)}`;
} else {
  const count = bundle.split(anchor).length - 1;
  if (count !== 1) throw new Error(`expected one settled SVG injection anchor, found ${count}`);
  next = bundle.replace(anchor, `${anchor}\n${marker}\n${source}\n${endMarker}`);
}

new vm.Script(next, { filename: bundlePath });

if (process.argv.includes("--check")) {
  if (!next.includes(marker) || !next.includes(endMarker) || !next.includes("HandwritingSettledSvgPresentation")) {
    throw new Error("settled SVG presentation source is not present in the generated bundle");
  }
  console.log("PASS: settled SVG presentation bundle injection is valid");
} else {
  fs.writeFileSync(bundlePath, next);
  console.log("Updated main.js with settled SVG presentation helper");
}
