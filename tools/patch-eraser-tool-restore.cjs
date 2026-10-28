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
  'function E0(){jr=null,Vo=!1,Wi="nib",Hh=null}',
  'function E0(){HandwritingEraserToolRestore.clear(),jr=null,Vo=!1,Wi="nib",Hh=null}',
  "clear eraser restore state on reset",
);

replaceOnce(
  'function _i(i,e){e?Yo(i):Wi===i&&Yo("nib")}',
  'function _i(i,e){e&&i!=="eraser"&&HandwritingEraserToolRestore.clear(),e?Yo(i):Wi===i&&Yo("nib")}',
  "clear eraser restore state on mode change",
);

replaceOnce(
  'function Ko(){Yo("nib")}',
  'function Ko(){HandwritingEraserToolRestore.clear(),Yo("nib")}',
  "clear eraser restore state on released tip mode",
);

replaceOnce(
  'function yr(i){Mn=i;for(let e of B)e.clearSnapPreview();qn(),Ko(),yM()}',
  'function yr(i){HandwritingEraserToolRestore.clear(),Mn=i;for(let e of B)e.clearSnapPreview();qn(),Ko(),yM()}',
  "clear eraser restore state on pen selection",
);

replaceOnce(
  'function Ln(i){_i("eraser",i)}',
  'function Ln(i){i?HandwritingEraserToolRestore.enter(Mn,Y()):HandwritingEraserToolRestore.clear(),_i("eraser",i)}',
  "capture previous tool when eraser is selected",
);

replaceOnce(
  'function Dn(i){_i("pan",i)}var wr=ln;',
  'function Dn(i){_i("pan",i)}function restoreEraserTool(){let i=HandwritingEraserToolRestore.take();if(!i||Y()!=="eraser")return!1;i.tool&&Mn!==i.tool&&(Mn=i.tool,qn(),yM());return Yo(i.mode),!0}var wr=ln;',
  "add shared eraser restore operation",
);

replaceOnce(
  'this.hideEraserCursor();let v=this.erased,m=this.eraseFrom;',
  'this.hideEraserCursor(),restoreEraserTool();let v=this.erased,m=this.eraseFrom;',
  "restore tool after note erase",
);

replaceOnce(
  'let a=this.erasing;if(this.erasing=!1,a&&this.hideEraserCursor(),this.dragFrom)',
  'let a=this.erasing;if(this.erasing=!1,a&&this.hideEraserCursor(),a&&restoreEraserTool(),this.dragFrom)',
  "restore tool after PDF erase",
);

replaceOnce(
  'let o=this.penStroke,a=this.erasing;if(this.erasing=!1,this.contactStart=null,',
  'let o=this.penStroke,a=this.erasing;if(this.erasing=!1,a&&restoreEraserTool(),this.contactStart=null,',
  "restore tool after slide erase",
);

new vm.Script(bundle, { filename: bundlePath });
fs.writeFileSync(bundlePath, bundle);
console.log("Updated main.js for eraser tool restoration");
