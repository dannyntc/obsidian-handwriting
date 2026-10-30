const fs = require("node:fs");

const main = fs.readFileSync("main.js", "utf8");

const checks = [
  ["default settings enable infinite canvas", /extendCanvasWhileScrolling:!0/],
  ["missing infinite-canvas setting uses the enabled default", /extendCanvasWhileScrolling:e\?\.extendCanvasWhileScrolling===void 0\?lL\.extendCanvasWhileScrolling:e\?\.extendCanvasWhileScrolling===!0/],
  ["default settings show the zoom bar", /noteZoomControls:"show"/],
  ["missing zoom-bar setting uses the visible default", /noteZoomControls:id\(e\?\.noteZoomControls\?\?lL\.noteZoomControls\)/],
  ["explicit zoom-bar choices remain supported", /function id\(i\)\{return i==="show"\|\|i==="hide"\?i:"auto"\}/],
  ["default Fountain profile is v2", /penStyle:"fountain",fountainProfile:"v2"/],
  ["missing Fountain profile uses v2", /fountainProfile:e\?\.fountainProfile==="v1"\?"v1":"v2"/],
  ["settings describe infinite canvas as enabled by default", /Default on\./],
  ["settings describe zoom bar as visible by default", /Default visible\./],
];

const failures = checks.filter(([, pattern]) => !pattern.test(main)).map(([name]) => name);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS: ${checks.length} default-setting invariants`);
