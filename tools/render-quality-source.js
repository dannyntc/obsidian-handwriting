/*
 * Opt-in rendering comparison for the compiled Handwriting bundle.
 *
 * The source is injected into main.js after the stroke renderer exists. The
 * comparison intentionally keeps the production editor untouched: it draws
 * copied stroke data into short-lived diagnostic surfaces only.
 */
var HandwritingRenderDiagnostics=(()=>{
  const MAX_CANVAS_PIXELS=1_000_000;
  const MAX_TOTAL_PIXELS=3_000_000;
  const SCALE_OPTIONS=[1,1.25,1.5];
  const q=value=>Number.isFinite(value)&&value>0?value:1;
  const quality=(zoom,dpr,mobile=true)=>{
    zoom=q(zoom),dpr=q(dpr);
    const currentRasterScale=mobile?dpr*Math.min(Math.max(zoom,1.5),2):dpr*zoom;
    const nativeRasterScale=dpr*zoom;
    return{
      zoom,dpr,currentRasterScale,nativeRasterScale,
      currentBackingPerCss:currentRasterScale/zoom,
      nativeBackingPerCss:dpr,
      displayPhysicalScale:dpr*zoom
    };
  };
  const bounds=points=>{
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const point of points){
      x0=Math.min(x0,point.x),y0=Math.min(y0,point.y);
      x1=Math.max(x1,point.x),y1=Math.max(y1,point.y);
    }
    if(!Number.isFinite(x0))return{x:0,y:0,width:1,height:1};
    return{x:x0-24,y:y0-24,width:Math.max(1,x1-x0+48),height:Math.max(1,y1-y0+48)};
  };
  const stroke=(points,options={})=>({
    id:options.id??"diagnostic-stroke",
    tool:"pen",device:"pen",widthMode:"pressure",pressureSensitivity:"on",
    color:options.color??"#2f6de0",width:options.width??2.2,
    points:points.map((point,index)=>({
      x:point.x,y:point.y,pressure:point.pressure??.5,
      t:point.t??index*16
    })),bbox:bounds(points)
  });
  const synthetic=()=>[
    stroke([{x:55,y:85,pressure:.7},{x:140,y:35,pressure:.75},{x:225,y:85,pressure:.7}]),
    stroke([{x:70,y:155,pressure:.18},{x:145,y:155,pressure:.42},{x:220,y:155,pressure:.78}]),
    stroke([{x:70,y:225,pressure:.6},{x:92,y:185,pressure:.6},{x:135,y:185,pressure:.6},{x:160,y:225,pressure:.6},{x:135,y:265,pressure:.6},{x:92,y:265,pressure:.6},{x:70,y:225,pressure:.6}]),
    stroke([{x:210,y:80,pressure:.25},{x:235,y:150,pressure:.45},{x:260,y:220,pressure:.75}],{color:"#cf3040"}),
    stroke([{x:250,y:70,pressure:.5},{x:250,y:230,pressure:.5}],{width:3.2,color:"#12873d"})
  ];
  const copyStrokes=strokes=>strokes.map(item=>({...item,points:item.points.map(point=>({...point}))}));
  const el=(doc,tag,text,className)=>{
    const node=doc.createElement(tag);
    if(text!==void 0)node.textContent=text;
    if(className)node.className=className;
    return node;
  };
  const number=value=>Number.isFinite(value)?value.toFixed(3):"n/a";

  class RenderModal extends S.Modal{
    constructor(app,state){super(app);this.state=state;this.zoom=1;this.fixture="synthetic";this.raf=0;this.reportText=""}
    onOpen(){
      this.contentEl.empty();
      this.contentEl.addClass("handwriting-render-quality-modal");
      const doc=this.contentEl.ownerDocument;
      this.contentEl.appendChild(el(doc,"h2","Handwriting rendering comparison"));
      this.contentEl.appendChild(el(doc,"p","Diagnostic only. It replays copied stroke geometry and does not change the note or pen settings."));
      const controls=el(doc,"div",void 0,"handwriting-render-quality-controls");
      const zoomLabel=el(doc,"span","Scale:");
      controls.appendChild(zoomLabel);
      for(const scale of SCALE_OPTIONS){
        const button=el(doc,"button",`${Math.round(scale*100)}%`);
        button.type="button";
        button.addEventListener("click",()=>{this.zoom=scale;this.render()});
        controls.appendChild(button);
      }
      const fixtureLabel=el(doc,"span","Fixture:");
      controls.appendChild(fixtureLabel);
      for(const [value,label] of [["synthetic","Synthetic"],["last","Last stroke"]]){
        const button=el(doc,"button",label);
        button.type="button";
        button.addEventListener("click",()=>{this.fixture=value;this.render()});
        controls.appendChild(button);
      }
      const copy=el(doc,"button","Copy report");
      copy.type="button";
      copy.className="mod-cta";
      copy.addEventListener("click",async()=>{
        try{const clipboard=(doc.defaultView?.navigator??navigator).clipboard;if(!clipboard?.writeText)throw new Error("clipboard unavailable");await clipboard.writeText(this.reportText);copy.textContent="Copied";setTimeout(()=>copy.textContent="Copy report",1200)}
        catch{new S.Notice("Handwriting: could not copy the rendering report")}
      });
      controls.appendChild(copy);
      this.contentEl.appendChild(controls);
      this.caption=el(doc,"p",void 0,"handwriting-render-quality-caption");
      this.contentEl.appendChild(this.caption);
      this.stage=el(doc,"div",void 0,"handwriting-render-quality-stage-list");
      this.contentEl.appendChild(this.stage);
      this.report=el(doc,"pre",void 0,"handwriting-render-quality-report");
      this.contentEl.appendChild(this.report);
      this.render();
    }
    strokes(){
      if(this.fixture==="last"&&this.state.strokes?.length)return this.fit(copyStrokes(this.state.strokes.slice(-1)));
      return synthetic();
    }
    fit(strokes){
      const box=strokes.reduce((total,item)=>({
        x:Math.min(total.x,item.bbox?.x??Infinity),
        y:Math.min(total.y,item.bbox?.y??Infinity),
        right:Math.max(total.right,(item.bbox?.x??0)+(item.bbox?.width??0)),
        bottom:Math.max(total.bottom,(item.bbox?.y??0)+(item.bbox?.height??0))
      }),{x:Infinity,y:Infinity,right:-Infinity,bottom:-Infinity});
      if(!Number.isFinite(box.x)||!Number.isFinite(box.y))return strokes;
      const scale=Math.min(230/Math.max(1,box.right-box.x),270/Math.max(1,box.bottom-box.y));
      return strokes.map(item=>{
        const points=item.points.map(point=>({ ...point,x:25+(point.x-box.x)*scale,y:25+(point.y-box.y)*scale }));
        return{...item,points,bbox:bounds(points)};
      });
    }
    render(){
      if(!this.stage)return;
      if(this.raf)cancelAnimationFrame(this.raf);
      this.stage.empty?.();
      while(this.stage.firstChild)this.stage.removeChild(this.stage.firstChild);
      const doc=this.stage.ownerDocument;
      const dpr=q(this.state.devicePixelRatio??doc.defaultView?.devicePixelRatio??1);
      const mobile=this.state.mobile!==false;
      const metrics=quality(this.zoom,dpr,mobile);
      const strokes=this.strokes();
      this.caption.textContent=`${this.fixture==="last"&&this.state.strokes?.length?"Last committed stroke":"Synthetic fixture set"} · ${Math.round(this.zoom*100)}% · DPR ${dpr}`;
      this.renderCanvas(doc,strokes,"Current mobile recipe",metrics.currentRasterScale,metrics);
      this.renderCanvas(doc,strokes,"Native display raster",metrics.nativeRasterScale,metrics);
      this.renderSvg(doc,strokes,metrics);
      const paneReport=typeof this.state.pane?.zoomReport==="function"?(()=>{try{return this.state.pane.zoomReport()}catch(error){return`unavailable: ${String(error)}`}})():"unavailable: no active handwriting pane";
      this.reportText=[
        "Handwriting rendering comparison v1",
        `plugin: ${this.state.version??"unknown"}`,
        `fixture: ${this.fixture}`,
        `zoom: ${this.zoom}`,
        `devicePixelRatio: ${dpr}`,
        `mobile recipe raster scale: ${number(metrics.currentRasterScale)}`,
        `native raster scale: ${number(metrics.nativeRasterScale)}`,
        `display physical scale: ${number(metrics.displayPhysicalScale)}`,
        `current backing pixels per displayed CSS px: ${number(metrics.currentBackingPerCss)}`,
        `native backing pixels per displayed CSS px: ${number(metrics.nativeBackingPerCss)}`,
        `stroke count: ${strokes.length}`,
        "",
        paneReport
      ].join("\n");
      this.report.textContent=this.reportText;
    }
    stageBox(doc,kind,metrics){
      const card=el(doc,"section",void 0,"handwriting-render-quality-card");
      card.appendChild(el(doc,"h3",kind));
      const note=el(doc,"p",kind==="Current mobile recipe"?"Models the current oversampling and transformed presentation.":kind==="Native display raster"?"Uses the device display raster scale before the same visual zoom.":"Vector outline using the same stroke geometry.","handwriting-render-quality-note");
      card.appendChild(note);
      const stage=el(doc,"div",void 0,"handwriting-render-quality-stage");
      stage.style.width=`${280*this.zoom}px`;
      stage.style.height=`${320*this.zoom}px`;
      card.appendChild(stage);
      this.stage.appendChild(card);
      return stage;
    }
    renderCanvas(doc,strokes,kind,backingScale,metrics){
      const stage=this.stageBox(doc,kind,metrics);
      const width=280,height=320;
      const pixels=Math.round(width*backingScale)*Math.round(height*backingScale);
      if(pixels>MAX_CANVAS_PIXELS||pixels>MAX_TOTAL_PIXELS){stage.textContent="Diagnostic canvas allocation refused: pixel limit exceeded";return}
      const canvas=doc.createElement("canvas");
      canvas.width=Math.max(1,Math.round(width*backingScale));
      canvas.height=Math.max(1,Math.round(height*backingScale));
      canvas.style.width=`${width}px`,canvas.style.height=`${height}px`,canvas.style.transform=`scale(${this.zoom})`,canvas.style.transformOrigin="0 0";
      stage.appendChild(canvas);
      const ctx=canvas.getContext("2d");
      if(!ctx){stage.textContent="Canvas 2D context unavailable";return}
      ctx.setTransform(backingScale,0,0,backingScale,0,0),ctx.clearRect(0,0,width,height);
      for(const item of strokes){try{this.state.drawStroke(ctx,{x:0,y:0,zoom:1},item)}catch(error){stage.textContent=`Canvas replay failed: ${String(error)}`;break}}
    }
    renderSvg(doc,strokes,metrics){
      const stage=this.stageBox(doc,"SVG geometry reference",metrics);
      const svg=doc.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 280 320"),svg.setAttribute("width","280"),svg.setAttribute("height","320");
      svg.style.transform=`scale(${this.zoom})`,svg.style.transformOrigin="0 0";
      for(const item of strokes){const path=this.state.buildPath(item);if(!path)continue;const node=doc.createElementNS("http://www.w3.org/2000/svg","path");node.setAttribute("d",path),node.setAttribute("fill",this.state.colorFor?.(item)??item.color??"#2f6de0"),node.setAttribute("fill-rule","nonzero"),svg.appendChild(node)}
      stage.appendChild(svg);
    }
    onClose(){if(this.raf)cancelAnimationFrame(this.raf);this.stage=null;this.report=null;this.contentEl.empty()}
  }
  const open=(app,state)=>new RenderModal(app,state).open();
  return{open,quality,synthetic};
})();
