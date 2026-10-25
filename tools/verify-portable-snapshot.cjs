const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("tools/portable-snapshot-source.js", "utf8");
const bundle = fs.readFileSync("main.js", "utf8");

class TFile {
  constructor(path) {
    this.path = path;
    this.extension = "md";
  }
}

const notices = [];
const S = { TFile, Notice: message => notices.push(message) };
const context = {
  S,
  I: { pageIdOf: () => "page-123" },
  EE: () => "<path d=\"M0 0\"/>",
  window: {},
  requestAnimationFrame: callback => callback(),
  btoa: value => Buffer.from(value, "binary").toString("base64"),
  setTimeout,
  clearTimeout,
  console,
};
vm.runInNewContext(`${source}\nthis.PortableSnapshots=HandwritingPortableSnapshots;`, context);

(async()=>{
  const file = new TFile("folder/note.md");
  let note = "# Note\n\nText\n";
  const folders = new Set();
  const created = new Map();
  const vault = {
    getAbstractFileByPath(path) {
      return folders.has(path) || created.has(path) ? {} : null;
    },
    async createFolder(path) {
      folders.add(path);
    },
    async create(path, content) {
      created.set(path, content);
      return { path };
    },
    async process(target, callback) {
      note = callback(note);
      return target;
    },
  };

  const manager = new context.PortableSnapshots({ vault });
  await manager.publish(file, { svg: "<svg/>" }, 4);

  if (!note.includes("handwriting-portable-snapshot:start")) throw new Error("snapshot marker was not inserted");
  if (!note.includes("../Handwriting%20snapshots/page-123/snapshot-4-")) throw new Error("snapshot link is not relative to the note");
  if (created.size !== 1) throw new Error("snapshot attachment was not created");

  await manager.removePublishedBlock(file);
  if (note.includes("handwriting-portable-snapshot:start")) throw new Error("snapshot marker was not removable");
  if (!bundle.includes("HandwritingPortableSnapshots")) throw new Error("manager is missing from main.js");
  if (notices.length !== 0) throw new Error(`unexpected notices: ${notices.join(", ")}`);

  console.log("PASS: portable snapshot block and attachment lifecycle");
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
