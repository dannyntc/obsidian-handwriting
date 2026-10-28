const fs = require("node:fs");
const vm = require("node:vm");

const bundlePath = "main.js";
let bundle = fs.readFileSync(bundlePath, "utf8");

const replaceOnce = (oldText, newText, label) => {
  const count = bundle.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(oldText, newText);
};

replaceOnce(
  'this.committedSvgFailed=!1,this.settledSvgPresentationFallbackNoticed=!1,this.committedSvgRenderer.setMode(t);',
  'this.committedSvgFailed=!1,this.committedSvgLastGeneration=-1,this.committedSvgLastPath=null,this.settledSvgPresentationFallbackNoticed=!1,this.committedSvgRenderer.setMode(t);',
  "reset SVG publication generation",
);

replaceOnce(
  'reconcileCommittedSvg(e){let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;try{this.updateCommittedSvgViewport(),t.reconcile(e??this.committedSvgStrokes()),this.updateSettledSvgPresentation("reconcile")}catch(n){this.committedSvgFailed=!0,t.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentation?.hide("svg-fallback"),console.error("[handwriting] committed SVG renderer failed",n),new W.Notice("Handwriting: SVG ink fell back to Canvas"),this.scheduleRepaint("svg-fallback")}}',
  'reconcileCommittedSvg(e,o={}){let t=this.committedSvgRenderer;if(!t||t.report().mode!=="svg")return;let n=performance.now();try{this.updateCommittedSvgViewport();let r=this.filePath(),s=r?I.generation(r):null,a=o.priority&&Array.isArray(e);if(!a&&e===void 0&&this.committedSvgLastPath===r&&this.committedSvgLastGeneration===s){this.updateSettledSvgPresentation("viewport"),this.lastSvgHandoffMs=Math.max(0,performance.now()-n);return}a?t.upsertCommitted(e):t.reconcile(e??this.committedSvgStrokes()),this.committedSvgLastPath=r,this.committedSvgLastGeneration=s,this.updateSettledSvgPresentation(a?"commit":"reconcile"),this.lastSvgHandoffMs=Math.max(0,performance.now()-n)}catch(r){this.lastSvgHandoffMs=Math.max(0,performance.now()-n),this.committedSvgFailed=!0,t.setMode("canvas"),this.committedCanvas?.setCssStyles({visibility:"visible"}),this.highlightCanvas?.setCssStyles({visibility:"visible"}),this.settledSvgPresentation?.hide("svg-fallback"),console.error("[handwriting] committed SVG renderer failed",r),new W.Notice("Handwriting: SVG ink fell back to Canvas"),this.scheduleRepaint("svg-fallback")}}',
  "incremental SVG publication",
);

replaceOnce(
  'if(this.committedSvgRenderer?.report().mode==="svg")this.reconcileCommittedSvg();else for(let m of r)this.markCommittedPaint(m.tool),Q(this.committedCtxFor(m.tool),v,m,void 0,!0,void 0,yp(this.committedBacking,this.dpr))',
  'if(this.committedSvgRenderer?.report().mode==="svg")this.reconcileCommittedSvg(r,{priority:!0});else for(let m of r)this.markCommittedPaint(m.tool),Q(this.committedCtxFor(m.tool),v,m,void 0,!0,void 0,yp(this.committedBacking,this.dpr))',
  "priority publish on Pencil lift",
);

replaceOnce(
  'if(this.committedSvgRenderer?.report().mode==="svg"){this.reconcileCommittedSvg(n),this.lastPaintCam=e,this.paintedStrokeCount=n.length;return!1}',
  'if(this.committedSvgRenderer?.report().mode==="svg"){this.reconcileCommittedSvg(),this.lastPaintCam=e,this.paintedStrokeCount=n.length;return!1}',
  "skip duplicate full SVG repaint",
);

replaceOnce(
  'repaint(){this.exitSettledSvgPresentation("repaint");if(this.committedSvgRenderer?.report().mode==="svg"){this.updateCommittedSvgViewport(),this.reconcileCommittedSvg()}',
  'repaint(){if(this.committedSvgRenderer?.report().mode==="svg"){this.reconcileCommittedSvg()}',
  "preserve visible SVG during repaint",
);

replaceOnce(
  '`completed ink: ${JSON.stringify(this.committedSvgRenderer?.report?.()??{mode:"canvas"})}`,`settled SVG:',
  '`completed ink: ${JSON.stringify(this.committedSvgRenderer?.report?.()??{mode:"canvas"})}`,`svg handoff: ${Number.isFinite(this.lastSvgHandoffMs)?this.lastSvgHandoffMs.toFixed(2)+" ms":"(not measured)"}`,`settled SVG:',
  "SVG handoff diagnostics",
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js for incremental SVG publication");
