const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("tools/render-quality-source.js", "utf8");
const main = fs.readFileSync("main.js", "utf8");

if (!main.includes(source.trim())) {
  throw new Error("render-quality source is not injected into main.js");
}
for (const required of [
  "Handwriting rendering comparison",
  "Current mobile recipe",
  "Native display raster",
  "SVG geometry reference",
  "Copy report",
  "MAX_CANVAS_PIXELS",
]) {
  if (!source.includes(required)) throw new Error(`render-quality source is missing ${required}`);
}

const context = {
  S: {
    Modal: class {},
    Notice: class {},
  },
  Math,
  Number,
  Infinity,
};
vm.runInNewContext(source, context, { filename: "tools/render-quality-source.js" });
const diagnostics = context.HandwritingRenderDiagnostics;
if (!diagnostics) throw new Error("diagnostics helper did not initialize");

const at100 = diagnostics.quality(1, 2, true);
const at125 = diagnostics.quality(1.25, 2, true);
const at150 = diagnostics.quality(1.5, 2, true);
if (at100.currentRasterScale !== 3 || at100.nativeRasterScale !== 2) {
  throw new Error(`unexpected 100% quality model: ${JSON.stringify(at100)}`);
}
if (at125.currentRasterScale !== 3 || at125.nativeRasterScale !== 2.5) {
  throw new Error(`unexpected 125% quality model: ${JSON.stringify(at125)}`);
}
if (at150.currentRasterScale !== 3 || at150.nativeRasterScale !== 3) {
  throw new Error(`unexpected 150% quality model: ${JSON.stringify(at150)}`);
}

const fixtures = diagnostics.synthetic();
if (fixtures.length < 4 || fixtures.some(item => item.points.length < 2)) {
  throw new Error("synthetic comparison fixtures are incomplete");
}
const before = JSON.stringify(fixtures);
fixtures[0].points[0].x += 10;
if (JSON.stringify(diagnostics.synthetic()) !== before) {
  throw new Error("synthetic fixtures are not recreated independently");
}

console.log("PASS: rendering-quality diagnostic source and scale model");
