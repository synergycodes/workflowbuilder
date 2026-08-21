# How to change CSS tokens?

All colors, spacing, and radii resolve through `--wb-*` design-token custom properties
defined in `@workflowbuilder/ui/tokens.css` (imported by the SDK's stylesheet).
The shipped defaults live inside the `ui.base` cascade layer, so a plain
unlayered override in your own stylesheet always wins - import order does not
matter.

## Consuming from npm (SDK or UI package)

Override the variables you care about in any stylesheet of your app:

```css
:root {
  --wb-components-button-solid-primary-default: #0f62fe;
  --wb-ui-bg-inset: #f4f4f4;
}
```

To discover variable names, inspect elements in devtools or browse
`node_modules/@workflowbuilder/ui/dist/tokens.css`. Theme-specific values are
keyed on `html[data-theme='light' | 'dark']`, so scope your overrides the same
way when they should apply to one theme only.

## Working in this monorepo

The source of truth is `packages/tokens/tokens.json` (a Figma Tokens Studio
export) plus the build in `packages/tokens/src`. Edit the export (or re-export
from Figma) and run `pnpm build:ui`.

Do **not** edit `packages/ui/dist/tokens.css` - it is generated output and the
next build overwrites it.

## Enterprise

The enterprise version ships a Figma design kit; its generated stylesheet
replaces the `@import '@workflowbuilder/ui/tokens.css';` line in
`packages/sdk/src/index.css`.
