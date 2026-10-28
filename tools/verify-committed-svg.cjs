const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("tools/committed-svg-source.js", "utf8");
const context = { document: undefined, Map, Set, Math, Number, String, Object, Array };
vm.runInNewContext(source, context, { filename: "tools/committed-svg-source.js" });

const api = context.HandwritingCommittedSvg;
if (!api || typeof api.create !== "function") {
  throw new Error("committed SVG renderer did not expose create()");
}

const SVG_NS = "http://www.w3.org/2000/svg";
class Node {
  constructor(tag, namespace = null) {
    this.tagName = tag;
    this.namespaceURI = namespace;
    this.attributes = new Map();
    this.children = [];
    this.style = {};
    this.parentNode = null;
    this.className = "";
    this.appendCount = 0;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    this.appendCount++;
    return child;
  }
  insertBefore(child, before) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    const index = before ? this.children.indexOf(before) : -1;
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  remove() { this.parentNode?.removeChild(this); }
}
class Document {
  createElementNS(namespace, tag) { return new Node(tag, namespace); }
}

const doc = new Document();
const root = new Node("div");
const beforeHighlighter = new Node("canvas");
const beforePen = new Node("canvas");
root.appendChild(beforeHighlighter);
root.appendChild(beforePen);

let pathCalls = 0;
const paths = new Map([
  ["pen-1", "M 0 0 L 10 10 Z"],
  ["pen-2", "M 20 20 L 30 30 Z"],
  ["hl-1", "M 2 2 L 8 8 Z"],
]);
const renderer = api.create(root, {
  document: doc,
  highlighterBefore: beforeHighlighter,
  penBefore: beforePen,
  path: stroke => {
    pathCalls++;
    return paths.get(stroke.id);
  },
  color: stroke => stroke.color,
  revision: stroke => stroke.revision,
});

if (root.children.indexOf(renderer.highlighter) >= root.children.indexOf(beforeHighlighter)) {
  throw new Error("highlighter SVG was not inserted before the live highlighter canvas");
}
if (root.children.indexOf(renderer.pen) >= root.children.indexOf(beforePen)) {
  throw new Error("pen SVG was not inserted before the committed canvas");
}
if (renderer.highlighter.namespaceURI !== SVG_NS || renderer.pen.namespaceURI !== SVG_NS) {
  throw new Error("renderer surfaces are not SVG elements");
}

const strokes = [
  { id: "pen-1", tool: "pen", color: "#246", revision: 1, bbox: { x: 0, y: 0, width: 10, height: 10 } },
  { id: "hl-1", tool: "highlighter", color: "#fc0", revision: 1, bbox: { x: 2, y: 2, width: 6, height: 6 } },
];
renderer.setMode("svg");
renderer.setViewport({ x: -5, y: -6, width: 100, height: 80, zoom: 1.5 });
renderer.reconcile(strokes);

if (renderer.pen.style.display !== "" || renderer.highlighter.style.display !== "") {
  throw new Error("SVG mode did not show completed SVG layers");
}
if (renderer.pen.getAttribute("viewBox") !== "-5 -6 66.66666666666667 53.333333333333336") {
  throw new Error("SVG viewBox does not follow the camera viewport");
}
if (renderer.pen.children.length !== 1 || renderer.highlighter.children.length !== 1) {
  throw new Error("initial reconciliation did not create one path per layer");
}
if (renderer.pen.children[0].getAttribute("d") !== paths.get("pen-1")) {
  throw new Error("pen path geometry was not assigned");
}

const penNode = renderer.pen.children[0];
const penAppendsBeforeStableReconcile = penNode.appendCount;
const pathCallsBeforeStableReconcile = pathCalls;
renderer.reconcile([{ ...strokes[0], revision: 1 }, strokes[1]]);
if (renderer.pen.children[0] !== penNode) throw new Error("unchanged stroke node was recreated");
if (penNode.appendCount !== penAppendsBeforeStableReconcile) {
  throw new Error("unchanged stroke node was re-appended during reconciliation");
}
if (pathCalls !== pathCallsBeforeStableReconcile) {
  throw new Error("unchanged stroke geometry was regenerated during reconciliation");
}

const newStroke = { id: "pen-2", tool: "pen", color: "#357", revision: 1, bbox: { x: 20, y: 20, width: 10, height: 10 } };
const pathCallsBeforeIncremental = pathCalls;
renderer.upsertCommitted(newStroke);
if (pathCalls !== pathCallsBeforeIncremental + 1) {
  throw new Error("incremental commit regenerated more than the new stroke");
}
if (renderer.pen.children.length !== 2 || renderer.pen.children[1].getAttribute("d") !== paths.get("pen-2")) {
  throw new Error("incremental commit did not publish the new pen path");
}
if (penNode.appendCount !== penAppendsBeforeStableReconcile) {
  throw new Error("incremental commit re-appended an existing pen path");
}
if (renderer.report().incrementalUpserts !== 1) {
  throw new Error("incremental commit was not recorded");
}

renderer.reconcile([{ ...strokes[0], revision: 2, color: "#135" }]);
if (renderer.pen.children[0] !== penNode) throw new Error("changed stroke node was recreated");
if (renderer.pen.children[0].getAttribute("fill") !== "#135") throw new Error("stroke color was not updated");

renderer.setMode("canvas");
if (renderer.pen.style.display !== "none" || renderer.highlighter.style.display !== "none") {
  throw new Error("Canvas mode did not hide completed SVG layers");
}
renderer.setMode("svg");
renderer.clear();
if (renderer.pen.children.length !== 0 || renderer.highlighter.children.length !== 0) {
  throw new Error("clear() left stale SVG paths");
}

console.log("PASS: committed SVG renderer contract");
