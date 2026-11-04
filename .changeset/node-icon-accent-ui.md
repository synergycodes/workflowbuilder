---
'@workflowbuilder/ui': minor
---

`NodeIcon` takes an optional `accent` that tints its container and colors the glyph: `'blue' | 'green' | 'orange' | 'violet' | 'gray' | 'violet-gradient'`, or a custom name read from `--wb-public-node-icon-color-<name>` and `--wb-public-node-icon-container-background-color-<name>`; `NodeIconAccent` is exported. The icon is 36px with an 18px glyph (46px and 24px before): `--wb-public-node-icon-padding` defaults to 8px and the new `--wb-public-node-icon-glyph-size` sets the glyph through `font-size`.

Breaking changes:

- Render the icon inside `NodeIcon` sized in `em`, for example a Phosphor icon, otherwise it keeps its own size and the header ports are not centred on it.
