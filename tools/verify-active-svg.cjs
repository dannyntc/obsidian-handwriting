const fs = require("node:fs");
const vm = require("node:vm");

const sourcePath = "tools/active-svg-source.js";
if (!fs.existsSync(sourcePath)) throw new Error("active SVG source is missing");
const source = fs.readFileSync(sourcePath, "utf8");
const context = { Math, Number, Infinity };
vm.runInNewContext(source, context, { filename: sourcePath });
const activeSvg = context.HandwritingActiveSvgStroke;
if (!activeSvg) throw new Error("active SVG stroke helper did not initialize");

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

const state = {
  ribbon: [
    { x: 0, y: 0, hw: 1 },
    { x: 4, y: 1, hw: 1.1 },
  ],
};
let hidden = 0;
let restored = 0;
const surface = activeSvg.create({
  document,
  window,
  getLayer: () => layer,
  getState: () => state,
  getStyle: () => ({ color: "#2f6de0" }),
  isEligible: () => true,
  pathFromRibbon: ribbon => ribbon.map(point => `${point.x}:${point.y}`).join(" "),
  hideCanvas: () => { hidden++; },
  restoreCanvas: () => { restored++; },
});

if (!surface.start()) throw new Error("active SVG stroke did not start");
if (layer.children.length !== 1) throw new Error("initial fountain ribbon was not attached");
if (hidden !== 1) throw new Error("wet canvas was not hidden after SVG handoff");

state.ribbon.push({ x: 8, y: 2, hw: 1.2 });
surface.schedule();
if (layer.children.length !== 1) throw new Error("scheduled active SVG update ran synchronously");
if (rafQueue.length !== 1) throw new Error("active SVG update was not batched into one frame");
rafQueue.shift()();
if (layer.children.length !== 2) throw new Error("incremental fountain ribbon was not attached");
if (!layer.children[1].getAttribute("d").includes("4:1")) {
  throw new Error("incremental SVG chunk did not bridge the previous endpoint");
}

surface.clear();
if (layer.children.length !== 0) throw new Error("active SVG paths were not removed on clear");
if (restored !== 1) throw new Error("wet canvas was not restored on clear");

console.log("PASS: active fountain SVG replay, frame batching, endpoint bridging, and cleanup");
