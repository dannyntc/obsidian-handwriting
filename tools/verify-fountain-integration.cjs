const fs = require("node:fs");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const source = fs.readFileSync("tools/fountain-ink-source.js", "utf8").trim();
const main = fs.readFileSync("main.js", "utf8");

if (manifest.version !== "1.8.0") throw new Error(`unexpected manifest version: ${manifest.version}`);
if (!main.includes("/* BEGIN HANDWRITING FOUNTAIN INK */") || !main.includes("/* END HANDWRITING FOUNTAIN INK */")) {
  throw new Error("fountain source markers are missing");
}
if (!main.includes(source)) throw new Error("main.js does not contain the current fountain source");

for (const fragment of [
  "if(HandwritingFountainInk.isFountain(t))return HandwritingFountainInk.drawCanvas",
  "if(HandwritingFountainInk.isFountain(i))return HandwritingFountainInk.path",
  "if(HandwritingFountainInk.isFountain(i))return HandwritingFountainInk.pdfGeometry",
  "fountainState=HandwritingFountainInk.isFountain",
  "HandwritingFountainInk.append(this.fountainState,n)",
  "HandwritingFountainInk.finish(this.fountainState)",
  "name:\"Pen style\"",
  "key:\"penStyle\"",
]) {
  if (!main.includes(fragment)) throw new Error(`bundle integration is missing: ${fragment}`);
}

console.log("PASS: fountain bundle, live renderer, exports, and setting integration");
