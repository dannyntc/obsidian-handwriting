const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(__dirname, "eraser-tool-restore-source.js");
const bundlePath = path.join(root, "main.js");

function loadState() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const context = {};
  vm.runInNewContext(source, context, { filename: sourcePath });
  return context.HandwritingEraserToolRestore;
}

function testCapturesOnlyTheOriginalTool() {
  const state = loadState();

  state.enter("highlighter", "nib");
  state.enter("pen", "lasso");

  assert.deepEqual(JSON.parse(JSON.stringify(state.snapshot())), { tool: "highlighter", mode: "nib", session: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(state.take())), { tool: "highlighter", mode: "nib", session: 1 });
  assert.equal(state.take(), null);
}

function testClearCancelsPendingRestore() {
  const state = loadState();

  state.enter("pen", "space");
  state.clear();

  assert.equal(state.snapshot(), null);
  assert.equal(state.take(), null);
}

function testBundleWiresRestoreToAllEraseCompletionPaths() {
  const bundle = fs.readFileSync(bundlePath, "utf8");

  assert.match(bundle, /HandwritingEraserToolRestore\.enter\(Mn,Y\(\)\)/);
  assert.match(bundle, /function restoreEraserTool\(\)/);
  assert.match(bundle, /this\.hideEraserCursor\(\),restoreEraserTool\(\)/);
  assert.match(bundle, /a&&restoreEraserTool\(\),this\.dragFrom/);
  assert.match(bundle, /this\.erasing=!1,a&&restoreEraserTool\(\),this\.contactStart/);
}

testCapturesOnlyTheOriginalTool();
testClearCancelsPendingRestore();
testBundleWiresRestoreToAllEraseCompletionPaths();

console.log("Eraser tool restore verification passed.");
