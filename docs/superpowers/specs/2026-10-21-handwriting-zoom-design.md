# Handwriting Zoom Design

**Status:** Approved for implementation

## Goal

Make Apple Pencil pinch zoom useful for handwritten Obsidian notes without making the page feel unstable: cap note zoom at 150%, keep pinch responsive, render settled ink sharply from its original stroke data, and keep the Obsidian sidebar outside the zoomed note pane.

## Current context

This workspace contains the installed Handwriting 1.4.23 bundle: `main.js`, `styles.css`, `manifest.json`, and `data.json`. There is no source tree, package manifest, test harness, or Git metadata. The bundle already has a pinch preview, camera scale state, cached raster layers, device-pixel-ratio handling, and a floating note-zoom control group.

The current zoom ceiling is 600%, pinch settling permits a temporary overshoot, and the control group has zoom-out, reset, zoom-in, and fit buttons. The user uses pinch only, sees persistent blur after zooming, and sees the Obsidian sidebar drift when zooming too far.

## Decisions

- Use pinch as the only magnification input.
- Enforce a hard 150% maximum, including previews, wheel/programmatic paths, and restored state.
- Replace the four-button zoom group with one compact floating readout inside the note pane. Tapping it resets to 100%; its accessible label and title describe the reset action.
- During pinch, reuse the current raster preview for low-latency visual feedback.
- After pinch release, redraw only the visible region from stored stroke geometry at the final effective CSS/device-pixel-ratio scale. Keep the preview visible until the redraw is ready, then swap it in.
- Coalesce or cancel stale settle redraws, reuse valid caches, and avoid reallocating canvases when dimensions have not changed.
- Keep note-owned transforms and clipping inside the note pane; do not modify global Obsidian sidebar CSS.

## Performance and quality constraints

The implementation must not rebuild every stroke for every pinch sample. A final redraw is acceptable after release if the preview remains visible and the redraw is bounded to the visible region. Rendering scale must account for CSS scale and device pixel ratio exactly once. If an allocation limit prevents full-page native resolution, render the visible region rather than enlarging memory limits globally.

The patch must preserve stored stroke coordinates, pressure, colors, undo/redo behavior, note contents, and existing handwriting data. There is no storage migration or new user setting for the maximum zoom.

## Acceptance criteria

- Repeated outward pinches stop at 150%; previously saved values above 150% reopen at 150% or below.
- Pinch preview stays responsive and does not flash blank during settling.
- Settled ink at 150% is produced from stroke geometry at the measured display resolution and no low-resolution preview remains as the final layer.
- The floating readout follows the current percentage and resets to 100% when tapped.
- Pencil drawing, erasing, selection, and undo remain aligned at 100% and 150%.
- The sidebar remains stable while zooming, resetting, rotating, and opening or closing it.
- `node --check main.js` passes and existing local handwriting state is unchanged.
