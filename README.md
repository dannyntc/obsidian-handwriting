# Handwriting for Obsidian

An Obsidian community plugin for handwriting, highlighting, erasing, and lasso selection with Apple Pencil and other pen input.

## Current release

Version `1.5.0`.

This release includes:

- Pinch-only note zoom capped at 150%.
- A floating zoom percentage readout that resets the note to 100% when tapped.
- Sharper settled handwriting after zooming with optimized redraw and compositing behavior.
- Portable SVG snapshots that keep handwritten notes readable when the plugin is disabled or removed.
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
node --check tools/verify-handwriting-zoom.cjs
node --check tools/verify-portable-snapshot.cjs
node tools/verify-handwriting-zoom.cjs
node tools/verify-portable-snapshot.cjs
```

## Repository contents

This is a compiled bundle rather than the original source/build repository. The public repository includes the plugin bundle, release notes, design records, and verification tools. Local Obsidian settings and handwriting data are intentionally excluded.

## Credits

Handwriting is authored by Alan. Support is available through [Ko-fi](https://ko-fi.com/ellimistafk).
