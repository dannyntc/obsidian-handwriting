const fs = require("node:fs");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count === 0 && bundle.includes(after)) return;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "canvas renderer dispatch",
  "function p0(i,e,t,n,r,s,o){let a=t.points;",
  "function p0(i,e,t,n,r,s,o){if(HandwritingFountainInk.isFountain(t))return HandwritingFountainInk.drawCanvas(i,e,t,n,r);let a=t.points;",
);
replaceOnce(
  "SVG renderer dispatch",
  "function TE(i){let e=_u(i);",
  "function TE(i){if(HandwritingFountainInk.isFountain(i))return HandwritingFountainInk.path(i);let e=_u(i);",
);
replaceOnce(
  "PDF renderer dispatch",
  "function Cy(i){let e=_u(i);",
  "function Cy(i){if(HandwritingFountainInk.isFountain(i))return HandwritingFountainInk.pdfGeometry(i);let e=_u(i);",
);
replaceOnce(
  "stroke field allowlist",
  'fg=new Set(["id","tool","color","width","createdAt","device","widthMode","pts","ptsd","points","page","pressureProfile","pressureSensitivity","inkStyle","inkSmoothing"]);',
  'fg=new Set(["id","tool","color","width","createdAt","device","widthMode","pts","ptsd","points","page","pressureProfile","pressureSensitivity","inkStyle","inkSmoothing"]);',
);
replaceOnce(
  "stroke serialization",
  '...t.pressureSensitivity==="on"||t.pressureSensitivity==="off"?{pressureSensitivity:t.pressureSensitivity}:{},...t.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...t.inkSmoothing==="on"||t.inkSmoothing==="off"?{inkSmoothing:t.inkSmoothing}:{},...typeof t.page=="number"',
  '...t.pressureSensitivity==="on"||t.pressureSensitivity==="off"?{pressureSensitivity:t.pressureSensitivity}:{},...t.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:t.inkStyle==="fountain-v2"?{inkStyle:"fountain-v2"}:{},...t.inkSmoothing==="on"||t.inkSmoothing==="off"?{inkSmoothing:t.inkSmoothing}:{},...typeof t.page=="number"',
);
replaceOnce(
  "stroke parser field",
  '...l.pressureSensitivity==="on"||l.pressureSensitivity==="off"?{pressureSensitivity:l.pressureSensitivity}:{},...l.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},...l.inkSmoothing==="on"||l.inkSmoothing==="off"?{inkSmoothing:l.inkSmoothing}:{},...Number.isInteger(l.page)&&l.page>=1?{page:l.page}:{}});',
  '...l.pressureSensitivity==="on"||l.pressureSensitivity==="off"?{pressureSensitivity:l.pressureSensitivity}:{},...l.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:l.inkStyle==="fountain-v2"?{inkStyle:"fountain-v2"}:{},...l.inkSmoothing==="on"||l.inkSmoothing==="off"?{inkSmoothing:l.inkSmoothing}:{},...Number.isInteger(l.page)&&l.page>=1?{page:l.page}:{}});',
);
replaceOnce(
  "unknown style preservation",
  'l.pressureSensitivity!==void 0&&l.pressureSensitivity!=="on"&&l.pressureSensitivity!=="off"&&(v.pressureSensitivity=l.pressureSensitivity),l.inkStyle!==void 0&&l.inkStyle!=="fountain-v1"&&(v.inkStyle=l.inkStyle),l.inkSmoothing!==void 0&&l.inkSmoothing!=="on"&&l.inkSmoothing!=="off"&&(v.inkSmoothing=l.inkSmoothing),Object.keys(v).length>0',
  'l.pressureSensitivity!==void 0&&l.pressureSensitivity!=="on"&&l.pressureSensitivity!=="off"&&(v.pressureSensitivity=l.pressureSensitivity),l.inkStyle!==void 0&&l.inkStyle!=="fountain-v1"&&l.inkStyle!=="fountain-v2"&&(v.inkStyle=l.inkStyle),l.inkSmoothing!==void 0&&l.inkSmoothing!=="on"&&l.inkSmoothing!=="off"&&(v.inkSmoothing=l.inkSmoothing),Object.keys(v).length>0',
);
replaceOnce(
  "builder style persistence",
  'this.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},',
  'this.inkStyle==="fountain-v1"||this.inkStyle==="fountain-v2"?{inkStyle:this.inkStyle}:{},',
);
replaceOnce(
  "shape style persistence",
  'i.inkStyle==="fountain-v1"?{inkStyle:"fountain-v1"}:{},',
  'i.inkStyle==="fountain-v1"||i.inkStyle==="fountain-v2"?{inkStyle:i.inkStyle}:{},',
);
replaceOnce(
  "default settings",
  'inkSmoothing:!0,penStyle:"fountain",fountainProfile:"v2",completedInkRenderer:"svg",inkAdaptsToTheme:!1,',
  'inkSmoothing:!0,penStyle:"fountain",fountainProfile:"v2",completedInkRenderer:"svg",inkAdaptsToTheme:!1,',
);
replaceOnce(
  "settings parser",
  'pressureSensitivity:oS(e),pressureChoice:oS(e),inkSmoothing:e?.inkSmoothing!==!1,penStyle:e?.penStyle==="classic"?"classic":"fountain",fountainProfile:e?.fountainProfile==="v1"?"v1":"v2",completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",inkAdaptsToTheme:',
  'pressureSensitivity:oS(e),pressureChoice:oS(e),inkSmoothing:e?.inkSmoothing!==!1,penStyle:e?.penStyle==="classic"?"classic":"fountain",fountainProfile:e?.fountainProfile==="v1"?"v1":"v2",completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",inkAdaptsToTheme:',
);
replaceOnce(
  "runtime style selection",
  'j.inkStyle=this.settings.penStyle==="fountain"?"fountain-v1":void 0',
  'j.inkStyle=this.settings.fountainProfile==="v1"?"fountain-v1":"fountain-v2"',
);
replaceOnce(
  "primary style selection",
  'this.activeStyle.inkStyle=j.inkStyle==="fountain-v2"&&s==="pen"&&t.pointerType==="pen"?"fountain-v2":void 0',
  'this.activeStyle.inkStyle=HandwritingFountainInk.isFountain(j)&&s==="pen"&&t.pointerType==="pen"?j.inkStyle:void 0',
);
replaceOnce(
  "PDF style selection",
  'this.strokeStyle.inkStyle=u==="pen"&&!this.mouseStroke&&j.inkStyle==="fountain-v2"?"fountain-v2":void 0',
  'this.strokeStyle.inkStyle=u==="pen"&&!this.mouseStroke&&HandwritingFountainInk.isFountain(j)?j.inkStyle:void 0',
);
replaceOnce(
  "slide style metadata",
  'inkStyle:e.tool==="pen"&&j.inkStyle==="fountain-v2"?"fountain-v2":void 0',
  'inkStyle:e.tool==="pen"&&HandwritingFountainInk.isFountain(j)?j.inkStyle:void 0',
);
replaceOnce(
  "live fountain field",
  'strokeStyle;fountainState;beginStroke(e,t,n=!1,r){',
  'strokeStyle;fountainState;fountainLastPoint;beginStroke(e,t,n=!1,r){',
);
replaceOnce(
  "live fountain initialization",
  't=this.strokeStyle??t,this.fountainState=HandwritingFountainInk.isFountain(t)?HandwritingFountainInk.createState(t):null,this.fountainState&&HandwritingFountainInk.append(this.fountainState,e),this.lastPoint=e,this.smoother.reset(e),',
  't=this.strokeStyle??t,this.fountainState=HandwritingFountainInk.isFountain(t)?HandwritingFountainInk.createState(t,4):null,this.fountainLastPoint=null,this.fountainState&&(HandwritingFountainInk.append(this.fountainState,e),this.fountainLastPoint=this.fountainState.ribbon[this.fountainState.ribbon.length-1]),this.lastPoint=e,this.smoother.reset(e),',
);
replaceOnce(
  "live fountain append",
  'appendPoint(e,t,n){if(this.fountainState){this.lastPoint&&this.markPaint();let r=this.incompletePaint;this.incompletePaint=!0;let s=HandwritingFountainInk.append(this.fountainState,n);s.length&&(mt(this.stripTarget(e,s),e,s,it(t)),this.growDirtyStrip(e,s),this.drewOnce||(this.drewOnce=!0,this.attrsAfterFirstDraw=this.currentAttrs())),this.lastPoint=n,this.incompletePaint=r;return}this.lastPoint&&this.markPaint();let r=this.incompletePaint;',
  'appendPoint(e,t,n){if(this.fountainState){this.lastPoint&&this.markPaint();let r=this.incompletePaint;this.incompletePaint=!0;let s=HandwritingFountainInk.append(this.fountainState,n),o=this.fountainLastPoint,a=o?[o,...s]:s;s.length&&(mt(this.stripTarget(e,a),e,a,it(t)),this.growDirtyStrip(e,a),this.fountainLastPoint=s[s.length-1],this.drewOnce||(this.drewOnce=!0,this.attrsAfterFirstDraw=this.currentAttrs())),this.lastPoint=n,this.incompletePaint=r;return}this.lastPoint&&this.markPaint();let r=this.incompletePaint;',
);
replaceOnce(
  "live fountain head",
  'head(){return this.smooth&&this.smoothThisStroke?this.smoother.head():void 0}',
  'head(){return this.fountainState?HandwritingFountainInk.head(this.fountainState):this.smooth&&this.smoothThisStroke?this.smoother.head():void 0}',
);
replaceOnce(
  "live fountain width",
  'liveHalfWidth(e,t){return e=this.strokeStyle??e,this.shapingThisStroke?this.shaper.last():ae(e,t)/2}',
  'liveHalfWidth(e,t){return e=this.strokeStyle??e,this.fountainState?this.fountainState.lastHalfWidth||e.baseWidth/2:this.shapingThisStroke?this.shaper.last():ae(e,t)/2}',
);
replaceOnce(
  "live fountain finish",
  'finishStroke(e,t){if(this.fountainState){t=this.strokeStyle??t;let n=HandwritingFountainInk.finish(this.fountainState);n.length&&(this.markPaint(),mt(this.stripTarget(e,n),e,n,it(t)),this.growDirtyStrip(e,n)),this.fountainState=null;return}if(t=this.strokeStyle??t,!this.smooth||!this.smoothThisStroke)return;',
  'finishStroke(e,t){if(this.fountainState){t=this.strokeStyle??t;let n=HandwritingFountainInk.finish(this.fountainState),r=this.fountainLastPoint,s=r?[r,...n]:n;n.length&&(this.markPaint(),mt(this.stripTarget(e,s),e,s,it(t)),this.growDirtyStrip(e,s),this.fountainLastPoint=n[n.length-1]),this.fountainState=null,this.fountainLastPoint=null;return}if(t=this.strokeStyle??t,!this.smooth||!this.smoothThisStroke)return;',
);
replaceOnce(
  "live fountain reset",
  'reset(){this.lastPoint=void 0,this.lastRibbon=void 0,this.fountainState=null,this.dirty=null,this.smoother.reset()}',
  'reset(){this.lastPoint=void 0,this.lastRibbon=void 0,this.fountainState=null,this.fountainLastPoint=null,this.dirty=null,this.smoother.reset()}',
);

new Function(bundle);
fs.writeFileSync(path, bundle);
console.log("Updated main.js with fountain dispatch, persistence, and settings integration");
