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

const oldMount = "this.activeSvgStroke=HandwritingActiveSvgStroke.create({document:t.ownerDocument,window:this.winRef,getLayer:()=>this.committedSvgRenderer?.pen,getState:()=>this.activeWet?.fountainState,getStyle:()=>this.activeStyle,isEligible:()=>this.canUseActiveSvgStroke(),pathFromRibbon:e=>HandwritingFountainInk.pathFromRibbon(e),hideCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"hidden\"}),restoreCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"\"})}),this.penCursorEl=";
const priorMount = "this.activeSvgStroke=HandwritingActiveSvgStroke.create({document:t.ownerDocument,window:this.winRef,getLayer:()=>this.committedSvgRenderer?.pen,getState:()=>this.activeWet?.fountainState,getStyle:()=>this.activeStyle,isEligible:()=>this.canUseActiveSvgStroke(),pathFromRibbon:e=>HandwritingFountainInk.pathFromRibbon(e),pathFromStroke:e=>HandwritingFountainInk.path(e,4),hideCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"hidden\"}),restoreCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"\"})}),this.penCursorEl=";
const currentMount = "this.activeSvgStroke=HandwritingActiveSvgStroke.create({document:t.ownerDocument,window:this.winRef,getLayer:()=>this.committedSvgRenderer?.pen,getState:()=>this.activeWet?.fountainState,getStyle:()=>this.activeStyle,isEligible:()=>this.canUseActiveSvgStroke(),pathFromState:e=>HandwritingFountainInk.pathFromState(e),pathFromRibbon:e=>HandwritingFountainInk.pathFromRibbon(e),pathFromStroke:e=>HandwritingFountainInk.path(e,4),adoptPath:(e,t,n)=>this.committedSvgRenderer?.adoptTransient?.(e,t,n)??!1,hideCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"hidden\"}),restoreCanvas:()=>this.activeWet?.canvas?.setCssStyles({visibility:\"\"})}),this.penCursorEl=";
const newMount = "this.activeSvgStroke=HandwritingActiveSvgStroke.create({document:t.ownerDocument,window:this.winRef,getLayer:()=>this.committedSvgRenderer?.pen,getState:()=>this.activeWet?.fountainState,getStyle:()=>this.activeStyle,isEligible:()=>this.canUseActiveSvgStroke(),getPreviewStroke:()=>{let e=this.builder?.snapshotReleaseFiltered?.()??[];return e.length===1?e[0]:null},getPreviewRevision:()=>{let e=this.builder,t=e?.points??[],n=e?.latestPressure??[],r=t[t.length-1]??{},s=n[n.length-1];return[t.length,r.x,r.y,r.t,s].join(\"|\")},pathFromState:e=>HandwritingFountainInk.pathFromState(e),pathFromRibbon:e=>HandwritingFountainInk.pathFromRibbon(e),pathFromStroke:e=>HandwritingFountainInk.path(e,4),adoptPath:(e,t,n)=>this.committedSvgRenderer?.adoptTransient?.(e,t,n)??!1,hideCanvas:()=>{let e=[],t=this.activeWet?.canvas,n=this.activeWet===this.wet?this.wetTileCanvas:null;for(let r of[t,n])r&&!e.some(s=>s.node===r)&&(e.push({node:r,visibility:r.style?.visibility??\"\"}),r.setCssStyles({visibility:\"hidden\"}));return e},restoreCanvas:e=>{for(let t of e??[])t.node?.setCssStyles({visibility:t.visibility??\"\"})}}),this.penCursorEl=";
if (bundle.includes(oldMount)) bundle = bundle.replace(oldMount, newMount);
else if (bundle.includes(priorMount)) bundle = bundle.replace(priorMount, newMount);
else if (bundle.includes(currentMount)) bundle = bundle.replace(currentMount, newMount);
else if (bundle.includes(newMount)) {
  // Already patched; keep the bundle unchanged so this script remains idempotent.
} else {
  const mountPattern = /this\.activeSvgStroke=HandwritingActiveSvgStroke\.create\(\{[\s\S]*?\}\),this\.penCursorEl=/;
  if (mountPattern.test(bundle)) bundle = bundle.replace(mountPattern, newMount);
  else throw new Error("active SVG mount and final path: expected one match, found 0");
}

const legacyMethods = "canUseActiveSvgStroke(){let e=this.activeStyle,t=this.activeWet,n=this.settledSvgPresentation?.report?.();return!this.retiring&&this.mode===\"ink\"&&e?.inkStyle===\"fountain-v1\"&&!!t?.fountainState&&this.committedSvgRenderer?.getMode?.()===\"svg\"&&n?.visible===!0}startActiveSvgStroke(){if(!this.activeSvgStroke)return!1;this.updateCommittedSvgViewport?.();this.updateSettledSvgPresentation?.(\"active-ink\");return this.activeSvgStroke.start()}scheduleActiveSvgStroke(){this.activeSvgStroke?.schedule?.()}flushActiveSvgStroke(){return this.activeSvgStroke?.flush?.()??!1}clearActiveSvgStroke(){this.activeSvgStroke?.clear?.()}";
if (bundle.includes(legacyMethods)) bundle = bundle.replace(legacyMethods, "");

const oldMethods = "canUseActiveSvgStroke(){let e=this.activeStyle,t=this.activeWet,n=this.settledSvgPresentation?.report?.();return!this.retiring&&this.mode===\"ink\"&&HandwritingFountainInk.isFountain(e)&&!!t?.fountainState&&this.committedSvgRenderer?.getMode?.()===\"svg\"&&n?.visible===!0}startActiveSvgStroke(){if(!this.activeSvgStroke)return!1;this.updateCommittedSvgViewport?.();this.updateSettledSvgPresentation?.(\"active-ink\");return this.activeSvgStroke.start()}scheduleActiveSvgStroke(){this.activeSvgStroke?.schedule?.()}flushActiveSvgStroke(){return this.activeSvgStroke?.flush?.()??!1}clearActiveSvgStroke(){this.activeSvgStroke?.clear?.()}";
const methods = "canUseActiveSvgStroke(){let e=this.activeStyle,t=this.activeWet,n=this.settledSvgPresentation?.report?.();return!this.retiring&&this.mode===\"ink\"&&HandwritingFountainInk.isFountain(e)&&!!t?.fountainState&&this.committedSvgRenderer?.getMode?.()===\"svg\"&&n?.visible===!0}startActiveSvgStroke(){if(!this.activeSvgStroke)return!1;this.updateCommittedSvgViewport?.();this.updateSettledSvgPresentation?.(\"active-ink\");return this.activeSvgStroke.start()}scheduleActiveSvgStroke(){this.activeSvgStroke?.schedule?.()}flushActiveSvgStroke(){return this.activeSvgStroke?.flush?.()??!1}handoffActiveSvgStroke(e){return this.activeSvgStroke?.complete?.(e)??!1}clearActiveSvgStroke(){this.activeSvgStroke?.clear?.()}";
if (bundle.includes(oldMethods)) bundle = bundle.replace(oldMethods, methods);
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
  "this.tail.drawHead(this.camera.snapshot,this.activeStyle,{x:d.x,y:d.y},{x:d.x,y:d.y},d.pressure,u)",
  "!this.activeSvgStroke?.report?.().active&&this.tail.drawHead(this.camera.snapshot,this.activeStyle,{x:d.x,y:d.y},{x:d.x,y:d.y},d.pressure,u)",
  "active SVG pen-down tip guard",
);

replaceOnce(
  "h&&this.tail.drawHead(r,this.activeStyle,h.from,h.to,h.pressure,u.hwWorld)",
  "!this.activeSvgStroke?.report?.().active&&h&&this.tail.drawHead(r,this.activeStyle,h.from,h.to,h.pressure,u.hwWorld)",
  "active SVG live tip guard",
);

replaceOnce(
  "d&&this.tail.draw(d.fromX,d.fromY,d.points,this.activeStyle.color,d.lineWidthPx)",
  "!this.activeSvgStroke?.report?.().active&&d&&this.tail.draw(d.fromX,d.fromY,d.points,this.activeStyle.color,d.lineWidthPx)",
  "active SVG predicted tip guard",
);

replaceOnce(
  'handleResize(){this.settledSvgGeometryCache=null,this.pinchPreview||this.exitSettledSvgPresentation?.("resize");',
  'handleResize(){this.settledSvgGeometryCache=null,(!this.pinchPreview&&!this.activeSvgStroke?.report?.().active)&&this.exitSettledSvgPresentation?.("resize");',
  "active SVG resize guard",
);

replaceOnce(
  "this.committedCtx.setTransform(d,0,0,d,0,0),this.committedBacking=d,this.updateCommittedSvgViewport?.(),",
  "this.committedCtx.setTransform(d,0,0,d,0,0),this.committedBacking=d,this.updateCommittedSvgViewport?.(),this.activeSvgStroke?.report?.().active&&this.updateSettledSvgPresentation?.(\"active-resize\"),",
  "active SVG resize presentation",
);

const oldLift = "this.clearSnapPreview(),this.flushActiveSvgStroke?.(),this.builder=null,this.strokePenGesture=!1;";
const newLift = "this.clearSnapPreview(),this.builder=null,this.strokePenGesture=!1;";
if (bundle.includes(oldLift)) bundle = bundle.replace(oldLift, newLift);

replaceOnce(
  "if(c!==1){let v=m=>{let g=structuredClone(m);return or(g,c),g};r=r.map(v),a&&(a=v(a)),l&&(l=v(l))}let h=r.at(-1),",
  "if(c!==1){let v=m=>{let g=structuredClone(m);return or(g,c),g};r=r.map(v),a&&(a=v(a)),l&&(l=v(l))}this.handoffActiveSvgStroke?.(r?.[0]);let h=r.at(-1),",
  "active SVG final path handoff",
);

replaceOnce(
  ",!h||!d){this.clearActiveSvgStroke?.(),this.activeWet.clearStroke(this.cssWidth,this.cssHeight),this.tail.clear(this.cssWidth,this.cssHeight),this.tail.prepareLive(null,null),this.highlightWetCanvas.setCssStyles({opacity:String(q)});return}",
  ",!h||!d){this.activeWet.clearStroke(this.cssWidth,this.cssHeight),this.tail.clear(this.cssWidth,this.cssHeight),this.tail.prepareLive(null,null),this.highlightWetCanvas.setCssStyles({opacity:String(q)}),this.clearActiveSvgStroke?.();return}",
  "active SVG empty cleanup",
);

replaceOnce(
  "clearTransient:()=>{this.clearActiveSvgStroke?.(),this.activeWet.clearStroke(this.cssWidth,this.cssHeight),this.tail.clear(this.cssWidth,this.cssHeight),this.tail.prepareLive(null,null),this.activeWet===this.highlightWet&&this.highlightWetCanvas.setCssStyles({opacity:String(q)})},",
  "clearTransient:()=>{this.activeWet.clearStroke(this.cssWidth,this.cssHeight),this.tail.clear(this.cssWidth,this.cssHeight),this.tail.prepareLive(null,null),this.activeWet===this.highlightWet&&this.highlightWetCanvas.setCssStyles({opacity:String(q)}),this.clearActiveSvgStroke?.()},",
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
