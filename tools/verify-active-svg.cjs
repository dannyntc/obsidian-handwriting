const fs = require("node:fs");
const vm = require("node:vm");

const sourcePath = "tools/active-svg-source.js";
const fountainPath = "tools/fountain-ink-source.js";
if (!fs.existsSync(sourcePath) || !fs.existsSync(fountainPath)) throw new Error("active SVG sources are missing");
const fountainSource = fs.readFileSync(fountainPath, "utf8");
const source = fs.readFileSync(sourcePath, "utf8");
const context = { Math, Number, Infinity };
vm.runInNewContext(fountainSource, context, { filename: fountainPath });
vm.runInNewContext(source, context, { filename: sourcePath });
const activeSvg = context.HandwritingActiveSvgStroke;
if (!activeSvg) throw new Error("active SVG stroke helper did not initialize");
const fountain = context.HandwritingFountainInk;
if (!fountain) throw new Error("fountain renderer did not initialize");

class FakeNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  appendChild(node) {
    node.parentNode?.removeChild(node);
    node.parentNode = this;
    this.children.push(node);
    return node;
  }

  removeChild(node) {
    const index = this.children.indexOf(node);
    if (index >= 0) this.children.splice(index, 1);
    node.parentNode = null;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }
}

const document = {
  createElementNS(_namespace, tagName) {
    return new FakeNode(tagName, document);
  },
};
const layer = new FakeNode("svg", document);
const rafQueue = [];
const window = {
  requestAnimationFrame(callback) {
    rafQueue.push(callback);
    return rafQueue.length;
  },
  cancelAnimationFrame() {},
};

const style = {
  inkStyle: "fountain-v2",
  baseWidth: 2.2,
  pressureSensitivity: "on",
  inkSmoothing: "on",
};
const state = fountain.createState(style, 4);
const samples = [
  { x: 0, y: 0, pressure: 0.45, t: 0 },
  { x: 4, y: 1, pressure: 0.6, t: 16 },
  { x: 8, y: 2, pressure: 0.72, t: 32 },
];
for (const sample of samples.slice(0, 2)) fountain.append(state, sample);
const finalStroke = {
  id: "stroke-final",
  tool: "pen",
  color: "#2f6de0",
  width: style.baseWidth,
  inkStyle: style.inkStyle,
  pressureSensitivity: style.pressureSensitivity,
  inkSmoothing: style.inkSmoothing,
  points: samples,
};
let hidden = 0;
let restored = 0;
let adopted = 0;
let visibilityToken = null;
const surface = activeSvg.create({
  document,
  window,
  getLayer: () => layer,
  getState: () => state,
  getStyle: () => ({ color: "#2f6de0" }),
  isEligible: () => true,
  pathFromState: current => fountain.pathFromState(current),
  pathFromRibbon: ribbon => fountain.pathFromRibbon(ribbon),
  pathFromStroke: stroke => fountain.path(stroke, 4),
  adoptPath: (_stroke, node, d) => {
    adopted++;
    return node.getAttribute("d") === d;
  },
  hideCanvas: () => {
    hidden++;
    visibilityToken = { canvas: "visible", tile: "visible" };
    return visibilityToken;
  },
  restoreCanvas: token => {
    if (token !== visibilityToken) throw new Error("active SVG did not restore the captured raster visibility token");
    restored++;
  },
});

if (!surface.start()) throw new Error("active SVG stroke did not start");
if (layer.children.length !== 1) throw new Error("initial fountain ribbon was not attached");
if (hidden !== 1) throw new Error("wet canvas was not hidden after SVG handoff");
const liveBeforeLift = layer.children[0];

fountain.append(state, samples[2]);
surface.schedule();
if (layer.children.length !== 1) throw new Error("scheduled active SVG update ran synchronously");
if (rafQueue.length !== 1) throw new Error("active SVG update was not batched into one frame");
rafQueue.shift()();
if (layer.children.length !== 1) throw new Error("live SVG presentation created more than one path");
if (layer.children[0] !== liveBeforeLift) throw new Error("live SVG presentation replaced its path during writing");
const liveD = layer.children[0].getAttribute("d");
const settledD = fountain.path(finalStroke, 4);
if (liveD !== settledD) throw new Error("live SVG geometry differs from the settled Fountain geometry before lift");

if (typeof surface.complete !== "function") throw new Error("active SVG final handoff API is missing");
if (!surface.complete(finalStroke)) throw new Error("active SVG final handoff failed");
if (layer.children.length !== 1) throw new Error("final handoff did not preserve one live path");
if (layer.children[0] !== liveBeforeLift) throw new Error("final handoff replaced the visible live path");
if (layer.children[0].getAttribute("d") !== settledD) throw new Error("final handoff did not preserve the completed geometry");
if (adopted !== 1) throw new Error("final handoff did not offer the path for adoption");
if (hidden !== 1) throw new Error("final handoff toggled the wet canvas visibility");
if (restored !== 0) throw new Error("final handoff restored the wet canvas before cleanup");

surface.clear();
if (layer.children.length !== 1) throw new Error("adopted SVG path was removed during active cleanup");
if (restored !== 1) throw new Error("wet canvas was not restored on clear");

const shortLayer = new FakeNode("svg", document);
const shortState = fountain.createState(style, 4);
fountain.append(shortState, samples[0]);
const shortStroke = {
  ...finalStroke,
  id: "short-stroke",
  points: [samples[0], { ...samples[0], x: samples[0].x + 0.01, t: samples[0].t + 1 }],
};
const shortSurface = activeSvg.create({
  document,
  window,
  getLayer: () => shortLayer,
  getState: () => shortState,
  getPreviewStroke: () => shortStroke,
  getStyle: () => ({ color: "#2f6de0" }),
  isEligible: () => true,
  pathFromState: current => fountain.pathFromState(current),
  pathFromStroke: stroke => fountain.path(stroke, 4),
  hideCanvas: () => {},
  restoreCanvas: () => {},
});
if (!shortSurface.start()) throw new Error("short Fountain stroke did not start");
if (shortLayer.children[0].getAttribute("d") !== fountain.path(shortStroke, 4)) {
  throw new Error("short live stroke did not use the same provisional geometry as the settled stroke");
}
shortSurface.clear();
if (shortLayer.children.length !== 0) throw new Error("unadopted short SVG path was not removed on clear");

console.log("PASS: active fountain SVG replay, frame batching, provisional geometry, and ownership cleanup");
