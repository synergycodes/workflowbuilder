---
'@workflowbuilder/ui': minor
---

Design tokens synced with DS WB 2.0 1.1.37: the edge label stroke is 1px, node header, body and row spacing follows Node v2, Dark text colors for critical, success, warning and action and Dark icon colors for critical, success and warning move to stronger steps of their scales, and new `--wb-ds-*` tokens cover text field hover, badge, run status, code and node icon tiles. A selected edge label keeps the 1px stroke.

Breaking changes:

- `--wb-ds-canvas-edge-stroke-bold` is removed: use `var(--wb-ds-size-37)` (3px). `--wb-ds-canvas-edge-stroke-regular` is now 1px: use `var(--wb-ds-size-25)` to keep 2px.
- `--wb-ds-canvas-edge-stroke-critical` is removed: use `var(--wb-ds-colors-red-500)` in Light and `var(--wb-ds-colors-red-400)` in Dark to keep the previous color.
