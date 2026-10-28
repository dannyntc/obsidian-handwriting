const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("tools/settled-svg-presentation-source.js", "utf8");
const context = { Map, Set, Math, Number, String, Object, Array };
vm.runInNewContext(source, context, { filename: "tools/settled-svg-presentation-source.js" });

const api = context.HandwritingSettledSvgPresentation;
if (!api || typeof api.create !== "function" || typeof api.computeViewBox !== "function") {
  throw new Error("settled SVG presentation helper did not expose its contract");
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
const original = new Node("div", document);
const highlighter = new Node("svg", document);
const highlighterCanvas = new Node("canvas", document);
const pen = new Node("svg", document);
const penCanvas = new Node("canvas", document);
original.appendChild(highlighter);
original.appendChild(highlighterCanvas);
original.appendChild(pen);
original.appendChild(penCanvas);
presentationRoot.appendChild(original);

for (const layer of [pen, highlighter]) {
  layer.setAttribute("viewBox", "10 20 100 50");
  layer.setAttribute("width", "100");
  layer.setAttribute("height", "50");
  layer.style.display = "";
}

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
  layers: { highlighter, pen },
  clip: () => ({ left: 175, top: 225, width: 150, height: 75 }),
});

presentation.enter({
  sourceRect: { left: 100, top: 200, width: 300, height: 150 },
});

if (presentation.mode() !== "external") throw new Error("presentation did not enter external mode");
if (presentationRoot.children.length !== 2) throw new Error("external host was not created in the note root");
const host = presentationRoot.children[1];
if (host.parentNode !== presentationRoot) throw new Error("external host escaped the note root");
if (host.style.position !== "absolute" || host.style.zIndex !== "1") {
  throw new Error("external host does not use note-local layering");
}
if (host.style.left !== "125px" || host.style.top !== "165px") {
  throw new Error("external host was not positioned in note-root coordinates");
}
if (presentationRoot.style.position !== "relative" || presentationRoot.style.isolation !== "isolate") {
  throw new Error("presentation root was not isolated for local ink layering");
}
if (!Array.isArray(presentation.report().ancestorTransforms)) {
  throw new Error("presentation report does not expose host ancestor transforms");
}
if (host.style.width !== "150px" || host.style.height !== "75px") {
  throw new Error("external host was not sized to the clipped display rect");
}
if (highlighter.parentNode !== host || pen.parentNode !== host) {
  throw new Error("existing SVG layers were not moved into the external host");
}
if (original.children.length !== 2 || original.children[0] !== highlighterCanvas || original.children[1] !== penCanvas) {
  throw new Error("external presentation duplicated or left an SVG layer in the editor host");
}
const externalParts = pen.getAttribute("viewBox").split(" ").map(Number);
if (externalParts.length !== 4 || externalParts.some((value, index) => Math.abs(value - [35, 28.333333333333336, 50, 25][index]) > 1e-9)) {
  throw new Error("external SVG viewBox does not crop the original display rect");
}

presentation.exit();
if (presentation.mode() !== "editor") throw new Error("presentation did not restore editor mode");
if (original.children.length !== 4 || original.children[0] !== highlighter || original.children[1] !== highlighterCanvas || original.children[2] !== pen || original.children[3] !== penCanvas) {
  throw new Error("SVG layers did not return to their original sibling order");
}
if (pen.getAttribute("viewBox") !== "10 20 100 50") {
  throw new Error("editor viewBox was not restored");
}

presentationRoot.rect = { left: 150, top: 210, width: 100, height: 50 };
presentation.enter({
  sourceRect: { left: 100, top: 200, width: 300, height: 150 },
  clipRect: { left: 175, top: 225, width: 150, height: 75 },
});
if (host.style.left !== "25px" || host.style.top !== "15px" || host.style.width !== "75px" || host.style.height !== "35px") {
  throw new Error("external host did not clip to the note root bounds");
}
presentation.exit("root-clip-test");

presentation.dispose();
if (presentationRoot.children.length !== 1 || presentationRoot.children[0] !== original) {
  throw new Error("presentation host was not disposed from the note root");
}
if (presentationRoot.style.position !== undefined && presentationRoot.style.position !== "") {
  throw new Error("presentation root position was not restored");
}
if (presentationRoot.style.isolation !== undefined && presentationRoot.style.isolation !== "") {
  throw new Error("presentation root isolation was not restored");
}

console.log("PASS: settled SVG presentation contract");
