---
'@workflowbuilder/ui': major
---

Design token export from 15.09.2026 and 16.09.2026 (design system 1.1.9 to 1.1.12). New roles: `--wb-ds-canvas-node-body-*` and `--wb-ds-canvas-node-row-*` (padding, gap, radius of the node body and its rows), `--wb-ds-shadow-canvas-focus-ring-node-*` (renamed from `--wb-ds-shadow-canvas-focus-node-*`, which is removed), `--wb-ds-canvas-node-focus-ring-{active,critical,success,warning}` (renamed from `--wb-ds-canvas-node-focus-*`, same values; the node's focus ring now carries one name in colours, shadows and docs), `--wb-ds-components-button-ghost-{primary,critical,success,warning}-text-default` and `--wb-ds-components-button-solid-warning-text`. Ghost button labels in the light theme now use these darker component roles (WCAG AA on every tint) instead of the shared text roles. The orange scale (`--wb-ds-colors-orange-*`) has new values and `--wb-ds-colors-orange-500-{10..50}` replace `--wb-ds-colors-orange-400-{10..50}`, so every warning surface renders in the rebuilt orange. Removed orphans: `--wb-ds-canvas-node-inset`, `--wb-ds-canvas-node-gap-inner`. The Status "invalid" badge and the properties-panel indicator dot move from the raw `orange-400` primitive to the warning roles (`--wb-ds-canvas-badge-notify-warning-{bg-default,icon}`, `--wb-ds-ui-icon-warning-default`), so they stay visible on the rebuilt scale; the `--wb-public-status-invalid-*` defaults change accordingly.

Breaking changes:

- Replace any reference to `--wb-ds-shadow-canvas-focus-node-{x,y,blur,spread}` with `--wb-ds-shadow-canvas-focus-ring-node-*`.
- Replace `--wb-ds-canvas-node-focus-{active,critical,success,warning}` with `--wb-ds-canvas-node-focus-ring-{active,critical,success,warning}`.
- Replace `--wb-ds-colors-orange-400-{10..50}` with `--wb-ds-colors-orange-500-{10..50}`; expect different orange hues everywhere `--wb-ds-colors-orange-*` is used.
