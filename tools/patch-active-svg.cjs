const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
let bundle = fs.readFileSync(bundlePath, "utf8");

const replaceOnce = (before, after, label) => {
  const count = bundle.split(before).length - 1;
  if (bundle.includes(after)) return;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
};

replaceOnce(
  "presentProbePending=!1;scrollFn=null;",
  "presentProbePending=!1;activeSvgStroke=null;scrollFn=null;",
  "active SVG field",
);

replaceOnce(
  "this.activeWet=this.wet,this.tail=new gt(this.tailCanvas),this.penCursorEl=",
  "this.activeWet=this.wet,this.tail=new gt(this.tailCanvas),this.activeSvgStroke=HandwritingActiveSvgStroke.create({document:t.ownerDocument,window:this.winRef,getLayer:()=>this.committedSvgRenderer?.pen,getState:()=>this.activeWet?.fountainState,getStyle:()=>this.activeStyle,isEligible:()=>this.canUseActiveSvgStroke(),pathFromRibbon:e=>HandwritingFountainInk.pathFromRibbon(e),hideCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"hidden\"}),restoreCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"\"})}),this.penCursorEl=",
  "active SVG mount",
);

const methods = "canUseActiveSvgStroke(){let e=this.activeStyle,t=this.activeWet,n=this.settledSvgPresentation?.report?.();return!this.retiring&&this.mode===\"ink\"&&e?.inkStyle===\"fountain-v1\"&&!!t?.fountainState&&this.committedSvgRenderer?.getMode?.()===\"svg\"&&n?.visible===!0}startActiveSvgStroke(){if(!this.activeSvgStroke)return!1;this.updateCommittedSvgViewport?.();this.updateSettledSvgPresentation?.(\"active-ink\");return this.activeSvgStroke.start()}scheduleActiveSvgStroke(){this.activeSvgStroke?.schedule?.()}flushActiveSvgStroke(){return this.activeSvgStroke?.flush?.()??!1}clearActiveSvgStroke(){this.activeSvgStroke?.clear?.()}";
const methodAnchor = `${methods}penDown(e,t){this.viewportGeneration++,`;
while (bundle.includes(`${methods}${methodAnchor}`)) {
  bundle = bundle.replace(`${methods}${methodAnchor}`, methodAnchor);
}
replaceOnce(
  "penDown(e,t){this.viewportGeneration++,",
  methodAnchor,
  "active SVG methods",
);

replaceOnce(
  "this.activeWet.beginStroke(d,this.activeStyle,s===\"highlighter\",this.builder.resolvedPressureProfile);let u=",
  "this.activeWet.beginStroke(d,this.activeStyle,s===\"highlighter\",this.builder.resolvedPressureProfile),this.startActiveSvgStroke?.();let u=",
  "active SVG start hook",
);

replaceOnce(
  "o++)}let l=performance.now(),c=e[e.length-1].timestamp;",
  "o++)}this.scheduleActiveSvgStroke?.();let l=performance.now(),c=e[e.length-1].timestamp;",
  "active SVG frame hook",
);

replaceOnce(
  "this.clearSnapPreview(),this.builder=null,this.strokePenGesture=!1;",
  "this.clearSnapPreview(),this.flushActiveSvgStroke?.(),this.builder=null,this.strokePenGesture=!1;",
  "active SVG lift flush",
);

replaceOnce(
  ",!h||!d){this.activeWet.clearStroke",
  ",!h||!d){this.clearActiveSvgStroke?.(),this.activeWet.clearStroke",
  "active SVG empty cleanup",
);

replaceOnce(
  "clearTransient:()=>{this.activeWet.clearStroke",
  "clearTransient:()=>{this.clearActiveSvgStroke?.(),this.activeWet.clearStroke",
  "active SVG commit cleanup",
);

replaceOnce(
  "unmount(){this.saveNoteCamera(),",
  "unmount(){this.clearActiveSvgStroke?.(),this.saveNoteCamera(),",
  "active SVG unmount cleanup",
);

replaceOnce(
  "applyCompletedInkRenderer(e){if(!this.committedSvgRenderer)return;this.exitSettledSvgPresentation(\"renderer\");",
  "applyCompletedInkRenderer(e){if(!this.committedSvgRenderer)return;this.clearActiveSvgStroke?.();this.exitSettledSvgPresentation(\"renderer\");",
  "active SVG renderer cleanup",
);

replaceOnce(
  "exitSettledSvgPresentation(e=\"hide\"){let t=",
  "exitSettledSvgPresentation(e=\"hide\"){this.clearActiveSvgStroke?.();let t=",
  "active SVG presentation cleanup",
);

replaceOnce(
  "this.committedSvgFailed=!0,t.setMode(\"canvas\"),this.committedCanvas?.setCssStyles",
  "this.committedSvgFailed=!0,this.clearActiveSvgStroke?.(),t.setMode(\"canvas\"),this.committedCanvas?.setCssStyles",
  "active SVG fallback cleanup",
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js with active SVG stroke lifecycle");
