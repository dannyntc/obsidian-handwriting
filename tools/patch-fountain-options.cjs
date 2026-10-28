const fs = require("node:fs");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "stroke option allowlist",
  '"pressureSensitivity","inkStyle"]);',
  '"pressureSensitivity","inkStyle","inkSmoothing"]);',
);
replaceOnce(
  "stroke option serialization",
  '...t.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...typeof t.page',
  '...t.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...t.inkSmoothing==="on"||t.inkSmoothing==="off"?{inkSmoothing:t.inkSmoothing}:{},...typeof t.page',
);
replaceOnce(
  "stroke option parsing",
  '...l.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...Number.isInteger(l.page)',
  '...l.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...l.inkSmoothing==="on"||l.inkSmoothing==="off"?{inkSmoothing:l.inkSmoothing}:{},...Number.isInteger(l.page)',
);
replaceOnce(
  "unknown smoothing preservation",
  'l.inkStyle!==void 0&&l.inkStyle!=="fountain-v1"&&(v.inkStyle=l.inkStyle),Object.keys(v).length>0',
  'l.inkStyle!==void 0&&l.inkStyle!=="fountain-v1"&&(v.inkStyle=l.inkStyle),l.inkSmoothing!==void 0&&l.inkSmoothing!=="on"&&l.inkSmoothing!=="off"&&(v.inkSmoothing=l.inkSmoothing),Object.keys(v).length>0',
);
replaceOnce(
  "builder option serialization",
  '...this.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{}}}',
  '...this.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...this.pressureSensitivity==="on"||this.pressureSensitivity==="off"?{pressureSensitivity:this.pressureSensitivity}:{},...this.inkSmoothing==="on"||this.inkSmoothing==="off"?{inkSmoothing:this.inkSmoothing}:{}}}',
);
replaceOnce(
  "shape option serialization",
  '...i.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{}}}var tl=',
  '...i.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...i.pressureSensitivity==="on"||i.pressureSensitivity==="off"?{pressureSensitivity:i.pressureSensitivity}:{},...i.inkSmoothing==="on"||i.inkSmoothing==="off"?{inkSmoothing:i.inkSmoothing}:{}}}var tl=',
);
replaceOnce(
  "runtime pressure option",
  'applyRuntimeSettings(){j.inkStyle=this.settings.penStyle==="fountain"?"fountain-v1":void 0,_o(this.settings.penTools),',
  'applyRuntimeSettings(){j.inkStyle=this.settings.penStyle==="fountain"?"fountain-v1":void 0,j.pressureSensitivity=this.settings.pressureSensitivity?"on":"off",j.inkSmoothing=this.settings.inkSmoothing?"on":"off",_o(this.settings.penTools),',
);
replaceOnce(
  "primary pressure option",
  'this.activeStyle.inkStyle=this.settings.penStyle==="fountain"&&s==="pen"&&t.pointerType==="pen"?"fountain-v1":void 0,t.pointerType',
  'this.activeStyle.inkStyle=this.settings.penStyle==="fountain"&&s==="pen"&&t.pointerType==="pen"?"fountain-v1":void 0,this.activeStyle.pressureSensitivity=this.settings.pressureSensitivity?"on":"off",this.activeStyle.inkSmoothing=this.settings.inkSmoothing?"on":"off",t.pointerType',
);

new Function(bundle);
fs.writeFileSync(path, bundle);
console.log("Updated main.js with per-stroke fountain options");
