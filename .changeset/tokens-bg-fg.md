---
'@workflowbuilder/sdk': patch
---

The bundled UI renames the chip, run-status and badge color tokens to `bg` / `fg` pairs: `--wb-ds-components-chips-solid` / `-solid-text` / `-inset-outline` become `-bg-solid` / `-fg-solid` / `-fg-outline`, `--wb-ds-canvas-run-status-icon-*` becomes `-fg-*`, and the badge `-text-*` / `-icon-*` tokens merge into `-fg-default` / `-fg-inverse`. Rename any overrides of the old names.
