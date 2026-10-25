# Changelog

This history reconstructs the changes made after the installed `1.4.23` bundle. The release periods are based on the preserved baseline, implementation plans/specifications, checkpoints, and verification records. The intermediate versions are historical groupings; the current distributable bundle is `1.5.1`.

## 1.5.1 — 2026-10-25

### Fixed

- Removed visible portable-snapshot HTML comment markers from notes while Handwriting is active.
- Replaced comment-delimited snapshot blocks with a self-identifying, comment-free HTML block.
- Automatically migrates both spaced and compact `1.5.0` snapshot markers when an affected note is refreshed.

### Compatibility

- Existing SVG snapshot attachments and editable `.handwriting` sidecars are preserved.
- Snapshots remain readable when the plugin is disabled or removed.

## 1.5.0 — 2026-10-25

### Added

- Portable note snapshots for inked Markdown notes.
- Managed snapshot blocks that link to SVG attachments under `Handwriting snapshots/<page-id>/`.
- Full-page snapshot rendering that combines the rendered note body with vector handwriting.
- Debounced refresh after handwriting or text changes, serialized per note and flushed during plugin shutdown.
- Refresh and rebuild commands for portable snapshots.

### Compatibility

- Snapshots remain visible in Obsidian when the Handwriting plugin is disabled or removed.
- Editable strokes remain in the existing `.handwriting` sidecar files and can be edited again when the plugin is re-enabled.
- Removing the last stroke removes the managed link while retaining previous SVG attachments for recovery.

## 1.4.25 — Follow-up period after 1.4.24 and before 1.5.0

### Fixed

- Reduced handwriting blur after pinch zoom by redrawing settled ink from stored stroke geometry at the final display resolution.
- Prevented low-resolution preview layers from becoming the final settled frame.
- Disabled image interpolation during pinch compositing to avoid a second smoothing pass.

### Performance

- Kept the high-resolution mobile backing target while preserving the actual visual pinch scale.
- Preserved coalesced settle/repaint work, generation guards, cache reuse, and canvas memory limits to minimize lag.

The workspace does not contain a separate timestamp for this follow-up, so it is intentionally recorded as a bounded implementation period rather than assigned an unsupported calendar date.

## 1.4.24 — 2026-10-21

### Added

- Pinch-only note zoom for Apple Pencil workflows.
- Hard 150% maximum zoom, including live preview and restored state.
- Floating percentage readout/reset control inside the note pane.

### Changed

- Removed the four-button zoom control in favor of the floating readout.
- Scoped note zoom transforms and clipping to the note pane so the Obsidian sidebar remains stable.
- Preserved existing stroke data, pressure, colors, undo/redo behavior, and note contents.

## 1.4.23 — Baseline

The installed bundle before the October 2026 zoom and portable-retention work.
