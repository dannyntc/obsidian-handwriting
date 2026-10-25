# Handwriting Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Apple Pencil pinch zoom responsive and sharp, with a hard 150% ceiling and a floating reset/readout inside the note pane.

**Architecture:** Keep the existing camera, pinch preview, cached canvas layers, and stroke geometry. Change the shared zoom ceiling, simplify the existing `Wa` control class to a readout/reset button, and make the post-pinch path invalidate or rebuild only the visible raster work whose scale is no longer valid. Keep note transforms clipped to the pane so app chrome is unaffected.

**Tech Stack:** Compiled JavaScript bundle, CSS, browser Canvas 2D, Obsidian plugin runtime, Node syntax checks, and manual iPad Pencil verification.

---

## File map and constraints

- Modify `main.js`: shared zoom ceiling, zoom-control class, pinch overshoot guard, final raster invalidation/repaint scheduling, and pane-owned zoom state.
- Modify `styles.css`: readout sizing/anchoring and pane clipping rules only.
- Add `tools/verify-handwriting-zoom.cjs`: read-only structural checks for the compiled bundle and cap/control invariants.
- Add `docs/superpowers/specs/2026-10-21-handwriting-zoom-design.md`: approved design record.
- Add `docs/superpowers/plans/2026-10-21-handwriting-zoom.md`: this implementation plan.
- Do not modify `data.json`, `manifest.json`, or handwriting storage.
- Because the bundle is minified and no source/build system exists, every bundle edit must be a guarded exact replacement. Abort the edit if the expected old fragment is absent or occurs more than once.

### Task 1: Create a recoverable baseline

**Files:**
- Read: `main.js`, `styles.css`, `data.json`, `manifest.json`
- Create outside the workspace: `<output-dir>/handwriting-zoom-baseline-2026-10-21/`

- [x] **Step 1: Verify the target files and current syntax.**

Run:

```bash
test -f main.js && test -f styles.css && test -f data.json && test -f manifest.json
node --check main.js
```

Expected: the four files exist and `node --check` exits 0.

- [x] **Step 2: Record baseline checksums and copies.**

Run with the explicit output directory:

```bash
mkdir -p "<output-dir>/handwriting-zoom-baseline-2026-10-21"
cp -p main.js styles.css data.json manifest.json "<output-dir>/handwriting-zoom-baseline-2026-10-21/"
shasum -a 256 main.js styles.css data.json manifest.json > "<output-dir>/handwriting-zoom-baseline-2026-10-21/SHA256SUMS"
```

Expected: the backup contains the four original files and a checksum manifest. If the filesystem blocks the output directory, stop before editing and report the exact permission error.

- [x] **Step 3: Capture the current structural anchors without changing files.**

Run:

```bash
rg -n -F 'var mn=6' main.js
rg -n -F 'Wa=class' main.js
rg -n -F 'function Lb(' main.js
rg -n -F 'e>mn*Ed' main.js
rg -n -F '.handwriting-note-viewport-controls {' styles.css
```

Expected: each required anchor is found before the patch. These anchors are the guards used by later tasks.

### Task 2: Add deterministic bundle checks

**Files:**
- Create: `tools/verify-handwriting-zoom.cjs`

- [x] **Step 1: Add a read-only verifier.**

Create the script with these checks:

```js
const fs = require("node:fs");

const main = fs.readFileSync("main.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

const checks = [
  ["150% zoom ceiling", /var mn=1\.5/],
  ["no four-button zoom tuple", !main.includes('["Zoom out","\\u2212"')],
  ["readout control class", main.includes('handwriting-note-viewport-controls')],
  ["pinch overshoot uses hard cap", !main.includes("e>mn*Ed")],
  ["pane clipping rule", css.includes(".handwriting-note-viewport-pane")],
  ["readout reset label", main.includes("Reset note zoom to 100%")],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PASS: ${checks.length} handwriting zoom invariants`);
```

- [x] **Step 2: Run it before implementation and confirm the expected failure.**

Run:

```bash
node tools/verify-handwriting-zoom.cjs
```

Expected: FAIL because the current bundle still contains `var mn=6`, the four-button tuple, and the overshoot guard. Do not treat this expected failure as a completed verification.

### Task 3: Enforce pinch-only zoom and the 150% cap

**Files:**
- Modify: `main.js` near the shared `mn`, `si`, and `Ed` constants; `Wa` control class; pinch commit guard.

- [x] **Step 1: Change the shared ceiling with an exact replacement.**

Replace exactly:

```js
var mn=6,si=.1,Ed=1.1;
```

with:

```js
var mn=1.5,si=.1,Ed=1.1;
```

Keep the existing minimum `si` and `Ed` symbol because other camera math references the same helper; remove overshoot separately in the commit guard.

- [x] **Step 2: Remove upper elastic overshoot from the final pinch commit.**

Replace the final-commit guard fragment:

```js
e>mn*Ed
```

with:

```js
e>mn
```

Keep all existing finite-value, viewport, and geometry guards around it. The live preview may visually follow the gesture up to the hard cap, but no commit path may accept a value above 1.5.

- [x] **Step 3: Clamp restored/programmatic state before layout.**

In the note viewport state restoration path, clamp any parsed `pinchScaleNow` or camera scale with the existing `Md` helper or an equivalent `Math.min(mn, value)` before `applyViewportBox` and before setting `cssScale`. Preserve the current value when it is finite and within `[si, mn]`; use the current minimum/normalization behavior for invalid values. Do not alter stored stroke data.

- [x] **Step 4: Re-run syntax and structural checks.**

Run:

```bash
node --check main.js
node tools/verify-handwriting-zoom.cjs
```

Expected: syntax passes; the verifier may still fail on the control class until Task 4 is complete.

### Task 4: Replace button zoom controls with a floating readout/reset

**Files:**
- Modify: `main.js` in the `Wa` class and its refresh method.
- Modify: `styles.css` in the `.handwriting-note-viewport-controls` rules.

- [x] **Step 1: Replace the four-button constructor loop with one reset button.**

The resulting constructor must preserve the existing element class, group role, `Ba` step-aside behavior, mode watchers, and refresh lifecycle, while creating exactly one button:

```js
this.element=e.createDiv({
  cls:"handwriting-note-viewport-controls",
  attr:{role:"group","aria-label":"Note zoom"}
});
let a=this.element.createEl("button",{
  text:"100%",
  attr:{type:"button","aria-label":"Reset note zoom to 100%",title:"Reset note zoom to 100%"}
});
a.addEventListener("pointerdown",l=>l.preventDefault());
a.addEventListener("click",()=>{n.resetNoteZoom(),this.refresh()});
this.buttons.push(a);
```

Use the bundle’s existing minified style when applying the exact replacement; do not leave unreachable handlers for zoom-in, zoom-out, or Fit.

- [x] **Step 2: Update refresh to show the current scale and disable only while busy.**

Use this behavior in the existing `refresh()` method:

```js
refresh(){
  let e=this.host.noteViewport?.getNoteViewportState();
  e&&this.buttons.forEach(n=>{
    n.disabled=e.busy;
    n.textContent=`${Number((Math.min(mn,e.zoom)*100).toPrecision(3))}%`;
  });
  let t=this.host.notePath?.()??null;
  this.element.toggleClass("is-hidden",!ov(td(),wt(t,sv()))),
  this.setInking(this.inking)
}
```

The readout must remain accessible as a button even at 100%; clicking it is harmless and keeps reset behavior discoverable.

- [x] **Step 3: Keep the readout inside pane chrome.**

Retain `position:absolute` and the existing note-pane host. Add `contain: layout paint;` only to the note-owned control group if measurements show its shadow contributes to scrollable overflow; keep `z-index` and safe-area offsets. Keep the control width compact and avoid layout margins that can push it outside the pane.

- [x] **Step 4: Run syntax and structural checks.**

Run:

```bash
node --check main.js
node tools/verify-handwriting-zoom.cjs
```

Expected: both pass and the verifier reports `PASS: 9 handwriting zoom invariants`.

### Task 5: Preserve pinch responsiveness and sharpen the settled frame

**Files:**
- Modify: `main.js` in the pinch settle/repaint/cache path.

- [x] **Step 1: Identify the existing preview-to-commit boundary.**

Use the existing `commitCameraScale`, `deferPinchRaster`, `restorePinchLayers`, `preparePinchComposite`, `paintCommittedWork`, `scheduleRepaint`, `damage`, `lastPaintCam`, `committedBacking`, and stroke revision fields. Do not introduce a second camera or a second stroke store.

- [x] **Step 2: Keep preview work cheap during pinch.**

Ensure pinch move handling continues to update camera/layout state and uses the existing preview composite/raster layers. Do not call full `paintCommittedWork(..., "all", ...)` or iterate all stored strokes from the pinch move callback. Coalesce the existing deferred repaint timer so only the latest scale is retained.

- [x] **Step 3: Force one final visible-region geometry repaint after release when scale changes.**

At the end of the successful pinch commit, compare the committed paint scale/backing (`lastPaintCam.zoom`, `committedBacking`, `dpr`) with the new camera scale. If the scale or backing resolution differs, invalidate the visible damage region and schedule one repaint. The repaint must call the existing stroke renderer (`Hi` through `paintCommittedWork`) with the current stroke revision and current camera, letting the existing stroke index limit work to visible bounds.

Do not hide the preview until the committed layer is ready. Keep the existing `pinchPreview`/`restorePinchLayers` handoff and ensure the final repaint clears the preview only after successful layer placement.

- [x] **Step 4: Prevent stale settle work from overwriting a newer gesture.**

Capture the current viewport generation or equivalent scale/revision token when scheduling the settle repaint. Before applying the queued result, compare it with the current token. Drop the result and let the newer gesture schedule its own repaint when they differ. A queued repaint must never restore an older camera scale.

- [x] **Step 5: Avoid unnecessary canvas reallocation.**

Keep the current canvas backing dimensions when the required width, height, CSS scale, and device pixel ratio are unchanged. Only resize/reinitialize backing canvases when one of those inputs changes. Preserve the existing memory ceilings and visible-region fallback.

- [x] **Step 6: Run syntax and invariant checks.**

Run:

```bash
node --check main.js
node tools/verify-handwriting-zoom.cjs
```

Expected: both pass. If the bundle has no unambiguous preview/settle boundary for a guarded edit, stop the implementation at that point and report the exact fragment rather than applying a broad minified rewrite.

Implementation note: the existing settle path already coalesces repaint work, guards queued writes with `viewportGeneration`, and redraws committed ink from stroke geometry after `handleResize()`. The targeted quality change therefore keeps visual placement at `Math.max(cssScale, pinchScaleNow)` while, on mobile, requesting a backing-raster scale of at least `mn` (150%) instead of adding a second renderer or an extra full-canvas pass. The live same-size composite disables image smoothing so it does not introduce an additional interpolation blur.

### Follow-up hard-cap correction

The first implementation retained the helper-level elastic allowance `mn*Ed`, which allowed live pinch preview to reach 165% even though the final commit guard was capped at 150%. The correction replaces `let n=t?mn*Ed:mn` with `let n=mn` in the pinch clamp helper and adds a verifier invariant that rejects any remaining `mn*Ed` source. The final verifier result is `PASS: 9 handwriting zoom invariants`.

### Task 6: Keep note zoom clipped from Obsidian chrome

**Files:**
- Modify: `main.js` only if the measured overflow comes from note-owned layout calculations.
- Modify: `styles.css` only for `.handwriting-note-viewport-pane`, `.cm-editor.handwriting-note-viewport`, and the floating readout.

- [x] **Step 1: Verify the clipping chain.**

Confirm the note pane has `overflow: hidden; overflow: clip;`, the editor does not apply a global transform to the workspace leaf, and the readout is positioned relative to the note viewport host. Preserve horizontal scrolling rules used by Infinite canvas.

- [x] **Step 2: Correct only demonstrated pane overflow.**

If the 150% zoom still changes sidebar bounds, adjust the note-owned host’s layout containment or counter-size calculation so the transformed note cannot contribute scrollable overflow to the workspace leaf. Do not add `overflow:hidden` to the workspace or sidebar globally, because that could break Obsidian navigation.

- [x] **Step 3: Re-run CSS-independent checks.**

Run:

```bash
node --check main.js
node tools/verify-handwriting-zoom.cjs
```

Expected: pass.

### Task 7: Manual iPad verification and performance report

**Files:**
- Read: `main.js`, `styles.css`, `data.json`
- Record results outside the workspace: `<output-dir>/handwriting-zoom-verification-2026-10-21.md`

- [ ] **Step 1: Reload the plugin and verify the control.**

On the affected iPad, enable Infinite canvas and the existing note zoom visibility setting, reload the plugin, and confirm only the floating percentage/reset control appears. Pinch to 150%, tap the readout, and confirm reset to 100%.

- [ ] **Step 2: Verify cap, alignment, and data preservation.**

Test repeated outward pinches, inward pinches, rotation, sidebar open/closed, drawing, erasing, selection, undo, and plugin reload. Confirm the readout never exceeds 150%, Pencil hit alignment is correct, the sidebar remains stable, and existing handwriting remains unchanged.

- [ ] **Step 3: Measure responsiveness.**

Use the plugin’s existing diagnostic timing/report path if available. Record pinch preview frame behavior, longest settle repaint, and release-to-sharp-frame time for a short note and a heavily handwritten note. A successful result is a responsive preview with one bounded final repaint and no blank flash; report measured times rather than asserting zero lag.

- [x] **Step 4: Verify the final files and backup.**

Run:

```bash
node --check main.js
node tools/verify-handwriting-zoom.cjs
shasum -a 256 main.js styles.css data.json manifest.json
```

Expected: syntax and invariants pass, `data.json` remains semantically unchanged, and the backup remains available for rollback.

### Task 8: Handoff and rollback

- [x] **Step 1: Document installation.**

Copy the patched `main.js` and `styles.css` into the plugin folder, reload Obsidian, enable Infinite canvas, and keep the zoom controls visible. State that a future community-plugin update may overwrite this local bundle patch.

- [x] **Step 2: Document rollback.**

Restore `main.js`, `styles.css`, `data.json`, and `manifest.json` from `<output-dir>/handwriting-zoom-baseline-2026-10-21/`, then reload the plugin. Do not delete handwriting storage.

## Verification summary

The required automated checks are `node --check main.js` and `node tools/verify-handwriting-zoom.cjs`; both pass. The required device checks are sharp settled ink, responsive pinch preview, a hard 150% ceiling, stable sidebar bounds, Pencil alignment, and unchanged stored handwriting. Those iPad/Obsidian checks remain pending because no iPad runtime is attached to this workspace; the verification report records the exact manual matrix.
