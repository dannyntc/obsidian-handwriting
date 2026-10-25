# Portable note snapshots

## Goal

Keep a readable copy of handwritten notes available in Obsidian when the Handwriting plugin is disabled or removed.

## Storage contract

- Editable strokes remain in the existing `.handwriting` sidecar JSON files.
- Inked Markdown notes receive a managed block marked by:
  - `<!-- handwriting-portable-snapshot:start -->`
  - `<!-- handwriting-portable-snapshot:end -->`
- The block contains a relative Markdown image link to an SVG in `Handwriting snapshots/<page-id>/`.
- Each published snapshot gets a new immutable filename. Failed publication leaves the previous link intact.
- When the last stroke is erased, the managed block is removed while old attachment files remain recoverable.

## Rendering

The snapshot renderer uses Obsidian’s Markdown renderer for the complete note body and serializes the rendered layout into an SVG `foreignObject`. Handwriting is added as vector paths from the original stroke geometry. Local Markdown images are embedded as data URLs when they can be resolved through the vault.

The source body excludes the managed snapshot block, preventing recursive snapshots. Width is taken from the open Markdown view when available; otherwise a readable default width is used. Snapshot work is debounced, serialized per note, retried on the next change after a stale stroke revision, and flushed during plugin shutdown.

## Compatibility

The Markdown note remains the owner of the snapshot link. Obsidian’s normal Markdown image renderer can display it without the plugin. Re-enabling the plugin continues to load and edit the original sidecar strokes.

SVG `foreignObject` rendering and complex external resources require device verification in Obsidian Mobile. A failed or unsupported export reports an error and preserves the previous managed link.
