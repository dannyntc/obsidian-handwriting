const fs = require("node:fs");
const vm = require("node:vm");

const main = fs.readFileSync("main.js", "utf8");
const helperStart = main.indexOf("function handwritingRasterBandOverscan(");
const helperEnd = main.indexOf("function li(", helperStart);

if (helperStart < 0 || helperEnd < 0) {
  throw new Error("adaptive raster overscan helper is missing");
}

const helperSource = main.slice(helperStart, helperEnd);
const context = {};
vm.runInNewContext(helperSource + "; this.handwritingRasterBandOverscan = handwritingRasterBandOverscan;", context);

const budget = 10_000_000;
const targetScale = 3;
const base = {
  clientWidth: 1024,
  clientHeight: 768,
  scrollWidth: 1800,
  rasterScale: targetScale,
  rasterBudget: budget,
};

const reduced = context.handwritingRasterBandOverscan(base, 192);
const pixels = (base.clientWidth + reduced * 2) * (base.clientHeight + reduced * 2) * targetScale ** 2;
const nextPixels = (base.clientWidth + (reduced + 1) * 2) * (base.clientHeight + (reduced + 1) * 2) * targetScale ** 2;

if (!(reduced < 192)) {
  throw new Error("expected overscan to shrink at 150%, got " + reduced);
}
if (pixels > budget) {
  throw new Error("adaptive band still exceeds raster budget: " + pixels);
}
if (nextPixels <= budget) {
  throw new Error("adaptive band left avoidable raster headroom: " + nextPixels);
}

const withinBudget = context.handwritingRasterBandOverscan({
  ...base,
  rasterScale: 2,
}, 192);
if (withinBudget !== 192) {
  throw new Error("overscan changed unnecessarily below the quality threshold: " + withinBudget);
}

const baseViewportTooLarge = context.handwritingRasterBandOverscan({
  ...base,
  clientWidth: 4000,
  scrollWidth: 4000,
}, 192);
if (baseViewportTooLarge !== 0) {
  throw new Error("overscan should be removed when the viewport alone exceeds budget: " + baseViewportTooLarge);
}

console.log("PASS: adaptive handwriting raster overscan");
