/* HANDWRITING ERASER TOOL RESTORE */
var HandwritingEraserToolRestore=(()=>{
  let pending=null,nextSession=0;
  const copy=value=>value?{tool:value.tool,mode:value.mode,session:value.session}:null;
  const normalizeTool=tool=>tool==="highlighter"?"highlighter":"pen";
  const normalizeMode=mode=>mode==="lasso"||mode==="space"||mode==="pan"?mode:"nib";
  return {
    enter(tool,mode){
      if(!pending)pending={tool:normalizeTool(tool),mode:normalizeMode(mode),session:++nextSession};
      return copy(pending)
    },
    clear(){pending=null},
    take(){const value=copy(pending);pending=null;return value},
    snapshot(){return copy(pending)}
  }
})();
