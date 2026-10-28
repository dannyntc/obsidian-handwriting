# Handwriting for Obsidian

An Obsidian community plugin for handwriting, highlighting, erasing, and lasso selection with Apple Pencil and other pen input.

## Current release

Version `1.7.1`.

This release includes:

- Pinch-only note zoom capped at 150%.
- A floating zoom percentage readout that resets the note to 100% when tapped.
- Sharper settled handwriting after zooming with optimized redraw and compositing behavior.
- Adaptive raster overscan that keeps 150% pinch-zoom handwriting at the requested Retina resolution without exceeding the canvas memory budget.
- A strict resize-path fix and an opt-in rendering comparison for separating raster, compositing, curve, and thin-stroke causes of softness.
- A refined fountain-pen style for new Apple Pencil strokes, with smoother pressure transitions, controlled speed thinning, rounded caps, and saved per-stroke style metadata. Classic rendering remains available in settings.
- Sharp SVG presentation for completed handwriting in Markdown notes, while canvas remains available as a compatibility fallback and continues to handle live Pencil ink.
- A developer **Settled SVG presentation** experiment. Choose **External (experiment)** under Handwriting settings to test idle completed SVG ink outside the scaled editor but inside the owning note's stacking context at 150%; **Editor (default)** preserves the current presentation until alignment and interaction are validated on iPad.
- Portable SVG snapshots stored in a comment-free managed HTML block, keeping handwritten notes readable when the plugin is disabled or removed.
- Editable handwriting preserved in the plugin's `.handwriting` sidecar storage when the plugin is re-enabled.

See [CHANGELOG.md](CHANGELOG.md) for the reconstructed release history.

## Installation

This repository contains the compiled plugin bundle. To install it manually, copy `main.js`, `styles.css`, and `manifest.json` into:

```text
<vault>/.obsidian/plugins/handwriting/
```

Then enable **Handwriting** in Obsidian's community-plugin settings.

## Verification

The repository includes deterministic checks for the zoom behavior and portable snapshot lifecycle:

```bash
node --check main.js
node --check tools/portable-snapshot-source.js
node --check tools/render-quality-source.js
node --check tools/fountain-ink-source.js
node --check tools/inject-fountain-ink.cjs
node --check tools/patch-fountain-bundle.cjs
node --check tools/patch-fountain-live.cjs
node --check tools/patch-fountain-options.cjs
node --check tools/patch-fountain-builder-options.cjs
node --check tools/patch-fountain-primary.cjs
node --check tools/patch-fountain-settings.cjs
node --check tools/verify-handwriting-raster.cjs
node --check tools/verify-handwriting-resize.cjs
node --check tools/verify-handwriting-render-quality.cjs
node --check tools/verify-fountain-ink.cjs
node --check tools/verify-fountain-storage.cjs
node --check tools/verify-fountain-integration.cjs
node --check tools/committed-svg-source.js
node --check tools/inject-committed-svg.cjs
node --check tools/patch-committed-svg.cjs
node --check tools/settled-svg-presentation-source.js
node --check tools/inject-settled-svg.cjs
node --check tools/patch-settled-svg.cjs
node --check tools/patch-settled-svg-contained.cjs
node --check tools/verify-settled-svg-presentation.cjs
node --check tools/verify-committed-svg.cjs
node --check tools/verify-committed-svg-integration.cjs
node --check tools/verify-handwriting-zoom.cjs
node --check tools/verify-portable-snapshot.cjs
node tools/verify-handwriting-raster.cjs
node tools/verify-handwriting-resize.cjs
node tools/verify-handwriting-render-quality.cjs
node tools/verify-fountain-ink.cjs
node tools/verify-fountain-storage.cjs
node tools/verify-fountain-integration.cjs
node tools/verify-committed-svg.cjs
node tools/verify-committed-svg-integration.cjs
node tools/verify-settled-svg-presentation.cjs
node tools/verify-handwriting-zoom.cjs
node tools/verify-portable-snapshot.cjs
```

For the rendering investigation, install the three distributable files, enable **Developer diagnostics**, reload the plugin, and run **Diagnostics: compare handwriting rendering**. Check the synthetic fixture and the last-stroke replay at 100%, 125%, and 150%, then use **Copy report** for the measured canvas and compositing data.

To test the settled SVG presentation experiment, open Handwriting settings, choose **External (experiment)** under **Settled SVG presentation**, then compare the same note at 100% and 150% after waiting two seconds for the note to settle. The settled layer stays within the owning note's stacking context and is clipped to the note root. Verify that it remains below sidebars and other UI, that **Diagnostics: show zoom report** opens, and that Pencil lift, scrolling, pinch zoom, erasing, and lasso selection work before switching the setting back to **Editor (default)** if alignment or interaction regresses.

New strokes use **Fountain pen** by default. To use the previous appearance for future strokes, open Handwriting settings and choose **Classic** under **Pen style**. Existing strokes keep the style saved with them.

## Repository contents

This is a compiled bundle rather than the original source/build repository. The public repository includes the plugin bundle, release notes, design records, and verification tools. Local Obsidian settings and handwriting data are intentionally excluded.

## Credits

Handwriting is authored by Alan. Support is available through [Ko-fi](https://ko-fi.com/ellimistafk).
