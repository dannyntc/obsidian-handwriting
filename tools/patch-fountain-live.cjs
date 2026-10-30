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
  "live fountain field",
  "strokeStyle;fountainState;beginStroke(e,t,n=!1,r){",
  "strokeStyle;fountainState;fountainLastPoint;beginStroke(e,t,n=!1,r){",
);
replaceOnce(
  "live fountain initialization",
  "t=this.strokeStyle??t,this.fountainState=HandwritingFountainInk.isFountain(t)?HandwritingFountainInk.createState(t):null,this.fountainState&&HandwritingFountainInk.append(this.fountainState,e),this.lastPoint=e,this.smoother.reset(e),",
  "t=this.strokeStyle??t,this.fountainState=HandwritingFountainInk.isFountain(t)?HandwritingFountainInk.createState(t):null,this.fountainLastPoint=null,this.fountainState&&(HandwritingFountainInk.append(this.fountainState,e),this.fountainLastPoint=this.fountainState.ribbon[this.fountainState.ribbon.length-1]),this.lastPoint=e,this.smoother.reset(e),",
);
replaceOnce(
  "live fountain append",
  "appendPoint(e,t,n){if(this.fountainState){this.lastPoint&&this.markPaint();let r=this.incompletePaint;this.incompletePaint=!0;let s=HandwritingFountainInk.append(this.fountainState,n);s.length&&(mt(this.stripTarget(e,s),e,s,it(t)),this.growDirtyStrip(e,s),this.drewOnce||(this.drewOnce=!0,this.attrsAfterFirstDraw=this.currentAttrs())),this.lastPoint=n,this.incompletePaint=r;return}this.lastPoint&&this.markPaint();let r=this.incompletePaint;",
  "appendPoint(e,t,n){if(this.fountainState){this.lastPoint&&this.markPaint();let r=this.incompletePaint;this.incompletePaint=!0;let s=HandwritingFountainInk.append(this.fountainState,n),o=this.fountainLastPoint,a=o?[o,...s]:s;s.length&&(mt(this.stripTarget(e,a),e,a,it(t)),this.growDirtyStrip(e,a),this.fountainLastPoint=s[s.length-1],this.drewOnce||(this.drewOnce=!0,this.attrsAfterFirstDraw=this.currentAttrs())),this.lastPoint=n,this.incompletePaint=r;return}this.lastPoint&&this.markPaint();let r=this.incompletePaint;",
);
replaceOnce(
  "live fountain head",
  "head(){return this.smooth&&this.smoothThisStroke?this.smoother.head():void 0}",
  "head(){return this.fountainState?HandwritingFountainInk.head(this.fountainState):this.smooth&&this.smoothThisStroke?this.smoother.head():void 0}",
);
replaceOnce(
  "live fountain width",
  "liveHalfWidth(e,t){return e=this.strokeStyle??e,this.shapingThisStroke?this.shaper.last():ae(e,t)/2}",
  "liveHalfWidth(e,t){return e=this.strokeStyle??e,this.fountainState?this.fountainState.lastHalfWidth||e.baseWidth/2:this.shapingThisStroke?this.shaper.last():ae(e,t)/2}",
);
replaceOnce(
  "live fountain finish",
  "finishStroke(e,t){if(this.fountainState){t=this.strokeStyle??t;let n=HandwritingFountainInk.finish(this.fountainState);n.length&&(this.markPaint(),mt(this.stripTarget(e,n),e,n,it(t)),this.growDirtyStrip(e,n)),this.fountainState=null;return}if(t=this.strokeStyle??t,!this.smooth||!this.smoothThisStroke)return;",
  "finishStroke(e,t){if(this.fountainState){t=this.strokeStyle??t;let n=HandwritingFountainInk.finish(this.fountainState),r=this.fountainLastPoint,s=r?[r,...n]:n;n.length&&(this.markPaint(),mt(this.stripTarget(e,s),e,s,it(t)),this.growDirtyStrip(e,s),this.fountainLastPoint=n[n.length-1]),this.fountainState=null,this.fountainLastPoint=null;return}if(t=this.strokeStyle??t,!this.smooth||!this.smoothThisStroke)return;",
);
replaceOnce(
  "live fountain reset",
  "reset(){this.lastPoint=void 0,this.lastRibbon=void 0,this.fountainState=null,this.dirty=null,this.smoother.reset()}",
  "reset(){this.lastPoint=void 0,this.lastRibbon=void 0,this.fountainState=null,this.fountainLastPoint=null,this.dirty=null,this.smoother.reset()}",
);

new Function(bundle);
fs.writeFileSync(path, bundle);
console.log("Updated main.js with live fountain rendering");
