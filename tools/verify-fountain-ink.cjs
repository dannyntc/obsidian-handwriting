const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("tools/fountain-ink-source.js", "utf8");
const context = { Math, Number, Infinity };
vm.runInNewContext(source, context, { filename: "tools/fountain-ink-source.js" });
const ink = context.HandwritingFountainInk;
if (!ink) throw new Error("fountain renderer did not initialize");

const stroke = (points, inkStyle = "fountain-v1") => ({
  inkStyle,
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

if (!ink.isFountain({ inkStyle: "fountain-v2" })) throw new Error("fountain-v2 was not recognized");
if (ink.resolveOptions({ inkStyle: "fountain-v2" }).style !== "fountain-v2") {
  throw new Error("fountain-v2 did not select its pressure profile");
}

const constantPressure = pressure => [
  { x: 0, y: 0, pressure, t: 0 },
  { x: 20, y: 0, pressure, t: 16 },
  { x: 40, y: 0, pressure, t: 32 },
  { x: 60, y: 0, pressure, t: 48 },
];
const widthAt = (pressure, inkStyle) => ink.build(stroke(constantPressure(pressure), inkStyle), 2)[1].hw;
const v1Light = widthAt(.1, "fountain-v1");
const v2Light = widthAt(.1, "fountain-v2");
const v1Middle = widthAt(.5, "fountain-v1");
const v2Middle = widthAt(.5, "fountain-v2");
const v1Firm = widthAt(.9, "fountain-v1");
const v2Firm = widthAt(.9, "fountain-v2");
if (!(v2Light < v1Light)) throw new Error("fountain-v2 light pressure is not thinner");
if (!(v2Firm > v1Firm)) throw new Error("fountain-v2 firm pressure is not thicker");
if (Math.abs(v2Middle / v1Middle - 1) >= .03) throw new Error("fountain-v2 changed middle pressure too much");

const pressureOffStroke = stroke(constantPressure(.1), "fountain-v2");
pressureOffStroke.pressureSensitivity = "off";
const pressureOff = ink.build(pressureOffStroke, 2);
if (pressureOff.slice(2).some(point => Math.abs(point.hw - pressureOff[2].hw) > 1e-9)) {
  throw new Error("pressure-off fountain-v2 stroke is not uniform");
}

const compatibilityPoints = [
  { x: 0, y: 0, pressure: .1, t: 0 },
  { x: 10, y: 0, pressure: .1, t: 16 },
  { x: 20, y: 0, pressure: .1, t: 32 },
  { x: 30, y: 0, pressure: .5, t: 48 },
  { x: 40, y: 0, pressure: .9, t: 64 },
  { x: 50, y: 0, pressure: .9, t: 80 },
];
const compatibilityRibbon = ink.build(stroke(compatibilityPoints, "fountain-v1"), 2);
const compatibilitySignature = compatibilityRibbon.map(point => point.hw.toFixed(12)).join(",");
const expectedCompatibilitySignature = "0.136212831746,0.331380958628,0.330215521215,0.329050083801,0.440180221731,0.551310359661,0.705130085575,0.858949811490,0.900939135947,0.942928460404,0.942928460404";
if (compatibilitySignature !== expectedCompatibilitySignature) {
  throw new Error("fountain-v1 compatibility geometry changed");
}

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

const incrementalV2Stroke = stroke(points, "fountain-v2");
const incrementalV2Ribbon = ink.build(incrementalV2Stroke, 2);
const incrementalV2 = ink.createState(incrementalV2Stroke, 2);
for (const point of points) ink.append(incrementalV2, point);
ink.finish(incrementalV2);
if (incrementalV2.ribbon.length !== incrementalV2Ribbon.length) throw new Error("v2 incremental and batch geometry differ in length");
for (let i = 0; i < incrementalV2Ribbon.length; i++) {
  if (Math.abs(incrementalV2Ribbon[i].x - incrementalV2.ribbon[i].x) > 1e-9 || Math.abs(incrementalV2Ribbon[i].hw - incrementalV2.ribbon[i].hw) > 1e-9) {
    throw new Error("v2 incremental and batch geometry differ");
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
