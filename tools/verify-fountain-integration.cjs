const fs = require("node:fs");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const source = fs.readFileSync("tools/fountain-ink-source.js", "utf8").trim();
const activeSource = fs.readFileSync("tools/active-svg-source.js", "utf8").trim();
const main = fs.readFileSync("main.js", "utf8");

if (manifest.version !== "1.8.5") throw new Error(`unexpected manifest version: ${manifest.version}`);
if (!main.includes("/* BEGIN HANDWRITING FOUNTAIN INK */") || !main.includes("/* END HANDWRITING FOUNTAIN INK */")) {
  throw new Error("fountain source markers are missing");
}
if (!main.includes(source)) throw new Error("main.js does not contain the current fountain source");
if (!main.includes("/* BEGIN HANDWRITING ACTIVE SVG */") || !main.includes("/* END HANDWRITING ACTIVE SVG */")) {
  throw new Error("active SVG source markers are missing");
}
if (!main.includes(activeSource)) throw new Error("main.js does not contain the current active SVG source");

for (const fragment of [
  "if(HandwritingFountainInk.isFountain(t))return HandwritingFountainInk.drawCanvas",
  "if(HandwritingFountainInk.isFountain(i))return HandwritingFountainInk.path",
  "if(HandwritingFountainInk.isFountain(i))return HandwritingFountainInk.pdfGeometry",
  "fountainState=HandwritingFountainInk.isFountain",
  "HandwritingFountainInk.append(this.fountainState,n)",
  "pathFromRibbon",
  "fountainState;fountainLastPoint;beginStroke",
  "o=this.fountainLastPoint,a=o?[o,...s]:s",
  "this.fountainLastPoint=s[s.length-1]",
  "HandwritingFountainInk.finish(this.fountainState)",
  "name:\"Pen style\"",
  "key:\"penStyle\"",
]) {
  if (!main.includes(fragment)) throw new Error(`bundle integration is missing: ${fragment}`);
}

for (const fragment of [
  "activeSvgStroke",
  "startActiveSvgStroke",
  "scheduleActiveSvgStroke",
  "clearActiveSvgStroke",
  "HandwritingActiveSvgStroke.create",
  "this.scheduleActiveSvgStroke?.()",
]) {
  if (!main.includes(fragment)) throw new Error(`active SVG integration is missing: ${fragment}`);
}

for (const method of [
  "canUseActiveSvgStroke(){",
  "startActiveSvgStroke(){",
  "scheduleActiveSvgStroke(){",
  "clearActiveSvgStroke(){",
]) {
  const count = main.split(method).length - 1;
  if (count !== 1) throw new Error(`active SVG method was duplicated: ${method} (${count})`);
}

console.log("PASS: fountain bundle, live renderer, exports, and setting integration");
