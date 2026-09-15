---
'@workflowbuilder/ui': minor
---

Design token export from 15.09.2026 (design system 1.1.9 to 1.1.11). New roles: `--wb-ds-canvas-node-body-*` and `--wb-ds-canvas-node-row-*` (padding, gap, radius of the node body and its rows), `--wb-ds-shadow-canvas-focus-ring-node-*` (renamed from `--wb-ds-shadow-canvas-focus-node-*`, which is removed), `--wb-ds-components-button-ghost-{primary,critical,success,warning}-text-default` and `--wb-ds-components-button-solid-warning-text`. Ghost button labels in the light theme now use these darker component roles (WCAG AA on every tint) instead of the shared text roles. The orange scale (`--wb-ds-colors-orange-*`) has new values and `--wb-ds-colors-orange-500-{10..50}` replace `--wb-ds-colors-orange-400-{10..50}`, so every warning surface renders in the rebuilt orange. Removed orphans: `--wb-ds-canvas-node-inset`, `--wb-ds-canvas-node-gap-inner`.

Breaking changes:

- Replace any reference to `--wb-ds-shadow-canvas-focus-node-{x,y,blur,spread}` with `--wb-ds-shadow-canvas-focus-ring-node-*`.
- Replace `--wb-ds-colors-orange-400-{10..50}` with `--wb-ds-colors-orange-500-{10..50}`; expect different orange hues everywhere `--wb-ds-colors-orange-*` is used.
