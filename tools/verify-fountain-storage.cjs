const fs = require("node:fs");

const main = fs.readFileSync("main.js", "utf8");
const required = [
  '"inkStyle"',
  't.inkStyle==="fountain-v1"',
  't.inkStyle==="fountain-v2"',
  'l.inkStyle==="fountain-v1"',
  'l.inkStyle==="fountain-v2"',
  'l.inkStyle!==void 0&&l.inkStyle!=="fountain-v1"&&l.inkStyle!=="fountain-v2"',
  't.inkSmoothing==="on"||t.inkSmoothing==="off"',
  'l.inkSmoothing==="on"||l.inkSmoothing==="off"',
  'l.inkSmoothing!==void 0&&l.inkSmoothing!=="on"&&l.inkSmoothing!=="off"',
  'this.builder.pressureSensitivity=this.activeStyle.pressureSensitivity',
  'this.builder.inkSmoothing=this.activeStyle.inkSmoothing',
  'this.inkStyle==="fountain-v1"',
  'penStyle:"fountain"',
  'e?.penStyle==="classic"?"classic":"fountain"',
];
for (const fragment of required) {
  if (!main.includes(fragment)) throw new Error(`storage/settings integration is missing: ${fragment}`);
}

const serialised = main.slice(main.indexOf("strokes:i.strokes.map"), main.indexOf("function tI()"));
if (!serialised.includes('t.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:t.inkStyle==="fountain-v2"?{inkStyle:"fountain-v2"}:{}')) {
  throw new Error("sidecar serializer does not emit the fountain style");
}
const parsed = main.slice(main.indexOf("n.strokes.push"), main.indexOf("function sI()"));
if (!parsed.includes('l.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:l.inkStyle==="fountain-v2"?{inkStyle:"fountain-v2"}:{}')) {
  throw new Error("sidecar parser does not restore the fountain style");
}
if (!parsed.includes('l.inkStyle!==void 0&&l.inkStyle!=="fountain-v1"&&l.inkStyle!=="fountain-v2"')) {
  throw new Error("unknown ink styles are not preserved");
}

console.log("PASS: fountain stroke storage and settings metadata");
