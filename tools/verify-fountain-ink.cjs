const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("tools/fountain-ink-source.js", "utf8");
const context = { Math, Number, Infinity };
vm.runInNewContext(source, context, { filename: "tools/fountain-ink-source.js" });
const ink = context.HandwritingFountainInk;
if (!ink) throw new Error("fountain renderer did not initialize");

const stroke = points => ({
  inkStyle: "fountain-v1",
  width: 2.2,
  pressureSensitivity: "on",
  inkSmoothing: "on",
  points,
});

const points = [
  { x: 0, y: 0, pressure: .2, t: 0 },
  { x: 5, y: 1, pressure: .35, t: 8 },
  { x: 12, y: 0, pressure: .55, t: 16 },
  { x: 20, y: 8, pressure: .8, t: 24 },
  { x: 26, y: 20, pressure: .7, t: 32 },
  { x: 30, y: 32, pressure: .25, t: 40 },
];

const full = stroke(points);
const ribbon = ink.build(full, 2);
if (ribbon.length < points.length) throw new Error("fountain ribbon lost samples");
if (ribbon.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.hw) || p.hw <= 0)) {
  throw new Error("fountain ribbon contains invalid geometry");
}

const pressures = ribbon.map(point => point.hw);
if (Math.max(...pressures) <= Math.min(...pressures)) throw new Error("pressure did not affect width");
if (!ink.path(full).includes(" Z")) throw new Error("fountain SVG path is incomplete");
if (typeof ink.pathFromRibbon !== "function") throw new Error("incremental fountain path helper is missing");
if (!ink.pathFromRibbon(ribbon).includes(" Z")) throw new Error("incremental fountain SVG path is incomplete");

const short = ink.build(stroke([
  { x: 0, y: 0, pressure: .5, t: 0 },
  { x: 1, y: 0, pressure: .5, t: 16 },
]), 2);
if (short.length === 0 || short[0].hw < .5) throw new Error("short mark was incorrectly tapered");

const incremental = ink.createState(full, 2);
for (const point of points) ink.append(incremental, point);
ink.finish(incremental);
if (incremental.ribbon.length !== ribbon.length) throw new Error("incremental and batch geometry differ in length");
for (let i = 0; i < ribbon.length; i++) {
  if (Math.abs(ribbon[i].x - incremental.ribbon[i].x) > 1e-9 || Math.abs(ribbon[i].hw - incremental.ribbon[i].hw) > 1e-9) {
    throw new Error("incremental and batch geometry differ");
  }
}

const edgeCases = stroke([
  { x: 0, y: 0, pressure: NaN, t: 0 },
  { x: 0, y: 0, pressure: 0, t: 0 },
  { x: 10, y: 0, pressure: 1, t: 0 },
  { x: 10, y: 10, pressure: .1, t: 1 },
]);
if (ink.build(edgeCases).some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.hw))) {
  throw new Error("edge-case geometry is not finite");
}

const legacy = { width: 2, points: [{ x: 0, y: 0, pressure: .5, t: 0 }, { x: 4, y: 0, pressure: .5, t: 16 }] };
if (ink.isFountain(legacy)) throw new Error("legacy stroke was classified as fountain");

console.log("PASS: fountain geometry, persistence identifier, and incremental replay");
