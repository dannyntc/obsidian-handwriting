const fs = require("node:fs");
const vm = require("node:vm");

const path = "main.js";
let bundle = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  bundle = bundle.replace(before, after);
}

function insertAfterClass(label, classNeedle, before, after) {
  const classStart = bundle.indexOf(classNeedle);
  if (classStart < 0) throw new Error(`${label}: class anchor is missing`);
  const offset = bundle.indexOf(before, classStart);
  if (offset < 0) throw new Error(`${label}: method anchor is missing`);
  bundle = `${bundle.slice(0, offset)}${after}${bundle.slice(offset)}`;
}

function replaceAfterClass(label, classNeedle, before, after) {
  const classStart = bundle.indexOf(classNeedle);
  if (classStart < 0) throw new Error(`${label}: class anchor is missing`);
  const offset = bundle.indexOf(before, classStart);
  if (offset < 0) throw new Error(`${label}: field anchor is missing`);
  const next = bundle.indexOf(before, offset + before.length);
  if (next >= 0 && next < bundle.indexOf("var ", classStart + classNeedle.length)) {
    throw new Error(`${label}: field anchor is ambiguous`);
  }
  bundle = `${bundle.slice(0, offset)}${bundle.slice(offset).replace(before, after)}`;
}

replaceAfterClass(
  "controller SVG fields",
  "var Ep=class",
  "committedCanvas;wetCanvas;",
  "committedCanvas;committedSvgRenderer=null;committedSvgFailed=!1;wetCanvas;",
);

replaceOnce(
  "controller SVG mount",
  "this.committedCanvas=o(),this.wetCanvas=o(),this.wetTileCanvas=o(),this.tailCanvas=o(),this.tailWashed=!1;let a=",
  "this.committedCanvas=o(),this.wetCanvas=o(),this.wetTileCanvas=o(),this.tailCanvas=o(),this.committedSvgRenderer=HandwritingCommittedSvg.create(s,{document:t.ownerDocument,highlighterBefore:this.highlightCanvas,penBefore:this.committedCanvas,highlighterOpacity:q,path:e=>TE(e),color:e=>ct(e.tool,e.color)}),this.applyCompletedInkRenderer(j.completedInkRenderer),this.tailWashed=!1;let a=",
);

const svgMethods = `applyCompletedInkRenderer(e){if(!this.committedSvgRenderer)return;let t=e==="canvas"?"canvas":"svg";this.committedSvgFailed=!1,this.committedSvgRenderer.setMode(t);let n=t==="svg"?"hidden":"visible";this.committedCanvas?.setCssStyles({visibility:n}),this.highlightCanvas?.setCssStyles({visibility:n}),t==="svg"?this.reconcileCommittedSvg():this.scheduleRepaint("renderer")}committedSvgStrokes(){let e=this.filePath();if(!e)return[];let t=I.strokes(e);if(t.length===0)return[];this.indexDirty&&(this.strokeIndex.rebuild(t),this.indexDirty=!1);let n=this.camera.snapshot,r=Math.max(.01,n.zoom),s=128/r,o={x:n.x-s,y:n.y-s,width:Math.max(1,this.cssWidth/r)+s*2,height:Math.max(1,this.cssHeight/r)+s*2},a=this.strokeIndex.query(o);return a.length>0?a:t}updateCommittedSvgViewport(){let e=this.committedSvgRenderer;if(!e)return;let t=this.camera.snapshot;e.setViewport({x:t.x,y:t.y,width:Math.max(1,this.cssWidth),height:Math.max(1,this.cssHeight),zoom:t.zoom,overscan:128})}reconcileCommittedSvg(e){let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;try{this.updateCommittedSvgViewport(),t.reconcile(e??this.committedSvgStrokes())}catch(n){this.committedSvgFailed=!0,t.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),console.error("[handwriting] committed SVG renderer failed",n),new W.Notice("Handwriting: SVG ink fell back to Canvas"),this.scheduleRepaint("svg-fallback")}}`;
insertAfterClass(
  "controller SVG methods",
  "var Ep=class",
  "handleResize(){",
  svgMethods,
);

replaceOnce(
  "SVG viewport on resize",
  "this.committedCtx.setTransform(d,0,0,d,0,0),this.committedBacking=d,",
  "this.committedCtx.setTransform(d,0,0,d,0,0),this.committedBacking=d,this.updateCommittedSvgViewport?.(),",
);

replaceOnce(
  "SVG viewport during pinch deferral",
  "repaint(){if(this.deferPinchRaster()){",
  'repaint(){if(this.committedSvgRenderer?.report().mode==="svg"){this.updateCommittedSvgViewport(),this.reconcileCommittedSvg()}if(this.deferPinchRaster()){',
);

replaceOnce(
  "SVG committed paint branch",
  "paintCommittedWork(e,t,n){let r=vm(W.Platform.isMobileApp,M()),s=",
  'paintCommittedWork(e,t,n){if(this.committedSvgRenderer?.report().mode==="svg"){this.reconcileCommittedSvg(n),this.lastPaintCam=e,this.paintedStrokeCount=n.length;return!1}let r=vm(W.Platform.isMobileApp,M()),s=',
);

replaceOnce(
  "SVG stroke commit handoff",
  'drawCommitted:()=>{let v=this.pinchPreview&&this.lastPaintCam?this.lastPaintCam:this.camera.snapshot;this.activeWet===this.highlightWet&&this.highlightWetCanvas.setCssStyles({opacity:"0"});for(let m of r)this.markCommittedPaint(m.tool),Q(this.committedCtxFor(m.tool),v,m,void 0,!0,void 0,yp(this.committedBacking,this.dpr))},',
  'drawCommitted:()=>{let v=this.pinchPreview&&this.lastPaintCam?this.lastPaintCam:this.camera.snapshot;this.activeWet===this.highlightWet&&this.highlightWetCanvas.setCssStyles({opacity:"0"});if(this.committedSvgRenderer?.report().mode==="svg")this.reconcileCommittedSvg();else for(let m of r)this.markCommittedPaint(m.tool),Q(this.committedCtxFor(m.tool),v,m,void 0,!0,void 0,yp(this.committedBacking,this.dpr))},',
);

replaceOnce(
  "SVG pinch composite bypass",
  "preparePinchComposite(){let e=this.wetCanvas;",
  'preparePinchComposite(){if(this.committedSvgRenderer?.report().mode==="svg")return!1;let e=this.wetCanvas;',
);

replaceOnce(
  "SVG stand-in bypass",
  "takeStandIn(e,t){if(!Nx||",
  'takeStandIn(e,t){if(this.committedSvgRenderer?.report().mode==="svg"||!Nx||',
);

replaceOnce(
  "SVG canvas carry bypass",
  "slideCommittedPixels(e,t,n){for(let[r,s]of[[this.committedCtx,this.committedCanvas],[this.highlightCtx,this.highlightCanvas]])",
  'slideCommittedPixels(e,t,n){if(this.committedSvgRenderer?.report().mode==="svg")return;for(let[r,s]of[[this.committedCtx,this.committedCanvas],[this.highlightCtx,this.highlightCanvas]])',
);

replaceOnce(
  "SVG extent build bypass",
  "extentBuildAllowed(){return this.cssScale<1&&",
  'extentBuildAllowed(){return this.committedSvgRenderer?.report().mode!=="svg"&&this.cssScale<1&&',
);

replaceOnce(
  "zoom report SVG metrics",
  '`file: ${this.filePath()??"(none)"}`,`devicePixelRatio: ${this.winRef.devicePixelRatio}`,',
  '`file: ${this.filePath()??"(none)"}`,`completed ink: ${JSON.stringify(this.committedSvgRenderer?.report?.()??{mode:"canvas"})}`,`devicePixelRatio: ${this.winRef.devicePixelRatio}`,',
);

replaceOnce(
  "default completed renderer",
  'penStyle:"fountain",inkAdaptsToTheme:',
  'penStyle:"fountain",completedInkRenderer:"svg",inkAdaptsToTheme:',
);

replaceOnce(
  "parsed completed renderer",
  'penStyle:e?.penStyle==="classic"?"classic":"fountain",inkAdaptsToTheme:',
  'penStyle:e?.penStyle==="classic"?"classic":"fountain",completedInkRenderer:e?.completedInkRenderer==="canvas"?"canvas":"svg",inkAdaptsToTheme:',
);

replaceOnce(
  "runtime completed renderer",
  'j.inkSmoothing=this.settings.inkSmoothing?"on":"off",_o(this.settings.penTools),',
  'j.inkSmoothing=this.settings.inkSmoothing?"on":"off",j.completedInkRenderer=this.settings.completedInkRenderer==="canvas"?"canvas":"svg",_o(this.settings.penTools),',
);

replaceOnce(
  "runtime renderer propagation",
  'this.applyBooxMode(),Fr("pen",this.settings.inkColors.pen),Fr("highlighter",this.settings.inkColors.highlighter),Hn(this.settings.eraserRadiusPx),pi(this.settings.eraserMode==="stroke"),Dp(this.settings.shapeSnap)}',
  'this.applyBooxMode(),Fr("pen",this.settings.inkColors.pen),Fr("highlighter",this.settings.inkColors.highlighter),Hn(this.settings.eraserRadiusPx),pi(this.settings.eraserMode==="stroke"),Dp(this.settings.shapeSnap),B.forEach(e=>e.applyCompletedInkRenderer?.(this.settings.completedInkRenderer))}',
);

replaceOnce(
  "completed renderer setting row",
  '},{name:"Fountain pressure profile",desc:"Choose the pressure response for new Fountain pen strokes. Existing handwriting keeps its saved profile.",control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"}}},{name:"Pen reticle"',
  '},{name:"Fountain pressure profile",desc:"Choose the pressure response for new Fountain pen strokes. Existing handwriting keeps its saved profile.",control:{type:"dropdown",key:"fountainProfile",options:{v1:"Original Fountain v1",v2:"Expanded pressure v2"}}},{name:"Completed handwriting",desc:"Choose how saved handwriting is presented in Markdown notes. SVG is sharper; Canvas is the compatibility fallback.",control:{type:"dropdown",key:"completedInkRenderer",options:{svg:"SVG (sharp)",canvas:"Canvas (compatibility)"}}},{name:"Pen reticle"',
);

replaceOnce(
  "completed renderer setting handler",
  'case"penStyle":r.penStyle=o==="classic"?"classic":"fountain",this.plugin.applyRuntimeSettings(),this.rerender();break;case"completedInkRenderer":',
  'case"completedInkRenderer":r.completedInkRenderer=o==="canvas"?"canvas":"svg",this.plugin.applyRuntimeSettings(),this.rerender();break;case"booxMode":',
);

new vm.Script(bundle, { filename: path });
fs.writeFileSync(path, bundle);
console.log("Updated main.js with the notes SVG completed-ink renderer");
