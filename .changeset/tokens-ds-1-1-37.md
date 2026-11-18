---
'@workflowbuilder/sdk': patch
---

The bundled UI picks up the DS WB 2.0 1.1.37 design tokens: a 1px edge label stroke, Node v2 spacing in node headers, bodies and rows, and stronger Dark status text and icon colors. `--wb-ds-canvas-edge-stroke-bold` and `--wb-ds-canvas-edge-stroke-critical` are removed: use `var(--wb-ds-size-37)` (3px) for the bold stroke, and `var(--wb-ds-colors-red-500)` (Light) or `var(--wb-ds-colors-red-400)` (Dark) for the critical stroke.
