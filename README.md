# Handwriting for Obsidian

An Obsidian community plugin for handwriting, highlighting, erasing, and lasso selection with Apple Pencil and other pen input.

## Current release

Version `1.8.0`.

This release includes:

- Pinch-only note zoom capped at 150%.
- A floating zoom percentage readout that resets the note to 100% when tapped.
- Sharper settled handwriting after zooming with optimized redraw and compositing behavior.
- Adaptive raster overscan that keeps 150% pinch-zoom handwriting at the requested Retina resolution without exceeding the canvas memory budget.
- A strict resize-path fix and an opt-in rendering comparison for separating raster, compositing, curve, and thin-stroke causes of softness.
- A refined fountain-pen style for new Apple Pencil strokes, with smoother pressure transitions, controlled speed thinning, rounded caps, and saved per-stroke style metadata. Classic rendering remains available in settings.
- A permanent note-local SVG layer for completed handwriting. It stays outside the scaled editor for crisp 100–150% presentation, remains clipped to the note viewport, and cannot cover sidebars or app chrome. Canvas remains available as the compatibility fallback and continues to handle live Pencil ink.
- Portable SVG snapshots stored in a comment-free managed HTML block, keeping handwritten notes readable when the plugin is disabled or removed.
- Editable handwriting preserved in the plugin's `.handwriting` sidecar storage when the plugin is re-enabled.
- After an erase gesture ends, the selected tool automatically returns to the pen or highlighter that was active before erasing.

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
node --check tools/patch-permanent-svg-layer.cjs
node --check tools/patch-permanent-svg-settings.cjs
node --check tools/patch-permanent-svg-fallback.cjs
node --check tools/patch-svg-latency.cjs
node --check tools/verify-settled-svg-presentation.cjs
node --check tools/verify-committed-svg.cjs
node --check tools/verify-committed-svg-integration.cjs
node --check tools/verify-handwriting-zoom.cjs
node --check tools/verify-portable-snapshot.cjs
node --check tools/eraser-tool-restore-source.js
node --check tools/inject-eraser-tool-restore.cjs
node --check tools/patch-eraser-tool-restore.cjs
node --check tools/verify-eraser-tool-restore.cjs
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
node tools/verify-eraser-tool-restore.cjs
```

For the rendering investigation, install the three distributable files, enable **Developer diagnostics**, reload the plugin, and run **Diagnostics: compare handwriting rendering**. Check the synthetic fixture and the last-stroke replay at 100%, 125%, and 150%, then use **Copy report** for the measured canvas and compositing data.

Completed SVG ink now uses the permanent note-local layer automatically. Compare the same note at 100% and 150%, verify that it remains below sidebars and other UI, confirm that **Diagnostics: show zoom report** opens, and test Pencil lift, scrolling, pinch zoom, erasing, and lasso selection. If the note root cannot be mapped safely, the plugin hides SVG and restores Canvas rendering for that note session.

The zoom report's `svg handoff` line measures the JavaScript time from SVG publication start to the completed presentation update. `completed ink` also reports `lastIncrementalMs`, `incrementalUpserts`, and `attributeWrites`; after a normal Pencil lift, the upsert count should increase by the number of newly completed strokes while existing paths remain cached.

New strokes use **Fountain pen** by default. To use the previous appearance for future strokes, open Handwriting settings and choose **Classic** under **Pen style**. Existing strokes keep the style saved with them.

## Repository contents

This is a compiled bundle rather than the original source/build repository. The public repository includes the plugin bundle, release notes, design records, and verification tools. Local Obsidian settings and handwriting data are intentionally excluded.

## Credits

Handwriting is authored by Alan. Support is available through [Ko-fi](https://ko-fi.com/ellimistafk).
