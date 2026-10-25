const fs = require("node:fs");

const main = fs.readFileSync("main.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

const checks = [
  ["150% zoom ceiling", /var mn=1\.5/.test(main)],
  ["no four-button zoom tuple", !main.includes('["Zoom out","\\u2212"')],
  ["readout control class", main.includes("handwriting-note-viewport-controls")],
  ["final pinch commit uses hard cap", !main.includes("e>mn*Ed")],
  ["pane clipping rule", css.includes(".handwriting-note-viewport-pane")],
  ["readout reset label", main.includes("Reset note zoom to 100%")],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS: ${checks.length} handwriting zoom invariants`);
