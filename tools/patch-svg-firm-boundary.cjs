const fs = require("node:fs");
const vm = require("node:vm");

const file = "main.js";
let bundle = fs.readFileSync(file, "utf8");

function replaceOnce(label, before, after) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
}

replaceOnce(
  "canvas overscroll allowance",
  "overscrollAllowancePx:()=>this.canvasMode?vp*(this.viewportLayout?.externalScale??1):0",
  "overscrollAllowancePx:()=>0",
);

replaceOnce(
  "canvas edge pull guard",
  "holdOverscrollGive(e,t){let n=this.bounceOffset;if(!n||this.retiring)return;",
  "holdOverscrollGive(e,t){let n=this.bounceOffset;if(!n||this.retiring||this.canvasMode)return;",
);

replaceOnce(
  "normal canvas bounce guard",
  "startOverscrollBounce(e,t,n,r=!1){let s=this.bounceOffset;if(!s||this.bouncedHold===e)return!1;",
  "startOverscrollBounce(e,t,n,r=!1){let s=this.bounceOffset;if(this.canvasMode&&!r)return!1;if(!s||this.bouncedHold===e)return!1;",
);

replaceOnce(
  "firm canvas stranded pan",
  "return r===0&&s===0?!1:(e.x=t,e.y=n,this.startOverscrollBounce({},r,s)?(this.writeViewportPan(),!0):(e.x+=r,e.y+=s,!1))",
  "return r===0&&s===0?!1:(e.x=t,e.y=n,this.canvasMode?(this.writeViewportPan(),!0):this.startOverscrollBounce({},r,s)?(this.writeViewportPan(),!0):(e.x+=r,e.y+=s,!1))",
);

new vm.Script(bundle, { filename: file });
fs.writeFileSync(file, bundle);
console.log("Disabled elastic canvas edge movement while preserving pinch correction");
