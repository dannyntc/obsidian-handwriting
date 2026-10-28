const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("tools/settled-svg-presentation-source.js", "utf8");
const context = { Map, Set, Math, Number, String, Object, Array, WeakMap };
vm.runInNewContext(source, context, { filename: "tools/settled-svg-presentation-source.js" });

const api = context.HandwritingSettledSvgPresentation;
if (!api || typeof api.create !== "function" || typeof api.computeViewBox !== "function") {
  throw new Error("permanent SVG presentation helper did not expose its contract");
}

class Node {
  constructor(tag, ownerDocument) {
    this.tagName = tag;
    this.nodeType = tag === "#document" ? 9 : 1;
    this.ownerDocument = ownerDocument;
    this.attributes = new Map();
    this.children = [];
    this.style = {};
    this.parentNode = null;
    this.className = "";
    this.isConnected = true;
    this.rect = { left: 0, top: 0, width: 0, height: 0 };
    this.computedTransform = "none";
    this.computedPosition = "static";
    this.computedIsolation = "auto";
    this.clientLeft = 0;
    this.clientTop = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
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
  get nextSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.children.indexOf(this);
    return index >= 0 ? this.parentNode.children[index + 1] ?? null : null;
  }
  get parentElement() {
    return this.parentNode?.nodeType === 1 ? this.parentNode : null;
  }
  contains(node) {
    return this === node || this.children.some(child => child.contains(node));
  }
  remove() { this.parentNode?.removeChild(this); }
  getBoundingClientRect() { return { ...this.rect }; }
}

class Document {
  constructor() {
    this.nodeType = 9;
    this.defaultView = {
      requestAnimationFrame: callback => callback(),
      getComputedStyle: node => {
        if (!node || node.nodeType !== 1) throw new TypeError("getComputedStyle requires an Element");
        return {
          transform: node.computedTransform,
          position: node.computedPosition,
          isolation: node.computedIsolation,
        };
      },
    };
    this.documentElement = new Node("html", this);
    this.documentElement.parentNode = this;
    this.body = new Node("body", this);
    this.documentElement.appendChild(this.body);
  }
  createElement(tag) { return new Node(tag, this); }
}

const document = new Document();
const presentationRoot = new Node("div", document);
presentationRoot.rect = { left: 50, top: 60, width: 500, height: 300 };
document.body.appendChild(presentationRoot);
const editor = new Node("div", document);
const scrollElement = new Node("div", document);
scrollElement.rect = { left: 100, top: 200, width: 300, height: 150 };
presentationRoot.appendChild(editor);
editor.appendChild(scrollElement);

const computed = api.computeViewBox(
  { left: 100, top: 200, width: 300, height: 150 },
  { left: 175, top: 225, width: 150, height: 75 },
  "10 20 100 50",
);
const computedParts = computed.split(" ").map(Number);
if (computedParts.length !== 4 || computedParts.some((value, index) => Math.abs(value - [35, 28.333333333333336, 50, 25][index]) > 1e-9)) {
  throw new Error(`cropped viewBox mapping is wrong: ${computed}`);
}

const presentation = api.create({
  document,
  presentationRoot,
  editor,
  scrollElement,
});

if (presentationRoot.children.length !== 2) throw new Error("permanent host was not created in the note root");
const host = presentationRoot.children[1];
if (presentation.layerRoot !== host || host.parentNode !== presentationRoot) {
  throw new Error("permanent SVG host escaped the note root");
}
if (host.style.position !== "absolute" || host.style.zIndex !== "1" || host.style.pointerEvents !== "none") {
  throw new Error("permanent host does not use note-local non-interactive layering");
}
if (presentationRoot.style.position !== "relative" || presentationRoot.style.isolation !== "isolate") {
  throw new Error("presentation root was not isolated for local ink layering");
}

const highlighter = new Node("svg", document);
const pen = new Node("svg", document);
for (const layer of [pen, highlighter]) {
  layer.setAttribute("viewBox", "10 20 100 50");
  layer.setAttribute("width", "100");
  layer.setAttribute("height", "50");
}
presentation.attach({ highlighter, pen });
if (highlighter.parentNode !== host || pen.parentNode !== host) {
  throw new Error("SVG layers were not attached to the permanent host");
}
const firstParents = [highlighter.parentNode, pen.parentNode];
const firstChildren = [...host.children];

if (!presentation.update({
  sourceRect: { left: 100, top: 200, width: 300, height: 150 },
  clipRect: { left: 175, top: 225, width: 150, height: 75 },
  presentationRootRect: presentationRoot.rect,
  viewBox: "10 20 100 50",
})) throw new Error("permanent presentation did not update");

if (presentation.mode() !== "permanent") throw new Error("presentation did not enter permanent mode");
if (host.style.left !== "125px" || host.style.top !== "165px" || host.style.width !== "150px" || host.style.height !== "75px") {
  throw new Error("permanent host was not positioned in note-root coordinates");
}
const permanentParts = pen.getAttribute("viewBox").split(" ").map(Number);
if (permanentParts.some((value, index) => Math.abs(value - [35, 28.333333333333336, 50, 25][index]) > 1e-9)) {
  throw new Error(`permanent SVG viewBox does not crop the source display rect: ${pen.getAttribute("viewBox")}`);
}
if (presentation.report().ancestorTransforms.length !== 0) {
  throw new Error("permanent host unexpectedly inherited a transform");
}

presentation.update({
  sourceRect: { left: 100, top: 200, width: 300, height: 150 },
  clipRect: { left: 150, top: 210, width: 200, height: 100 },
  presentationRootRect: presentationRoot.rect,
  viewBox: "10 20 100 50",
});
if (highlighter.parentNode !== firstParents[0] || pen.parentNode !== firstParents[1] || host.children[0] !== firstChildren[0] || host.children[1] !== firstChildren[1]) {
  throw new Error("SVG layer identity or order changed during an update");
}
if (host.style.left !== "100px" || host.style.top !== "150px" || host.style.width !== "200px" || host.style.height !== "100px") {
  throw new Error("permanent host did not follow a later viewport update");
}

presentation.hide("pen-down");
if (presentation.mode() !== "hidden" || host.parentNode !== presentationRoot || pen.parentNode !== host) {
  throw new Error("hide removed or reparented the permanent SVG layer");
}

presentationRoot.computedTransform = "matrix(2,0,0,2,0,0)";
if (presentation.update({
  sourceRect: { left: 100, top: 200, width: 300, height: 150 },
  clipRect: { left: 175, top: 225, width: 150, height: 75 },
  presentationRootRect: presentationRoot.rect,
  viewBox: "10 20 100 50",
})) throw new Error("unsupported transformed root was accepted");
if (presentation.report().reason !== "unsupported-root-transform" || presentation.mode() !== "hidden") {
  throw new Error("unsupported transform did not produce a safe hidden fallback");
}
presentationRoot.computedTransform = "none";

const second = api.create({ document, presentationRoot, editor, scrollElement });
if (presentationRoot.style.position !== "relative" || presentationRoot.style.isolation !== "isolate") {
  throw new Error("second presentation did not preserve shared root ownership");
}
presentation.dispose();
if (presentationRoot.style.position !== "relative" || presentationRoot.style.isolation !== "isolate") {
  throw new Error("first presentation restored styles still owned by a second instance");
}
second.dispose();
if ((presentationRoot.style.position ?? "") !== "" || (presentationRoot.style.isolation ?? "") !== "") {
  throw new Error("last presentation did not restore root inline styles");
}

console.log("PASS: permanent settled SVG presentation contract");
