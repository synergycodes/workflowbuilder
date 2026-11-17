---
'@workflowbuilder/ui': minor
---

Design tokens synced with the current design system: chip, run-status and badge colors come in `bg` / `fg` pairs, the outline chip and Light warning status are darker for contrast, and Dark edges are lighter.

Breaking changes:

- Chips: `--wb-ds-components-chips-solid` / `-solid-text` / `-inset-outline` become `-bg-solid` / `-fg-solid` / `-fg-outline`.
- Run status: `--wb-ds-canvas-run-status-icon-*` becomes `--wb-ds-canvas-run-status-fg-*`.
- Badge: `--wb-ds-components-badge-text-default` and `-icon-default` merge into `-fg-default`; `-text-inverse` and `-icon-inverse` into `-fg-inverse`.
