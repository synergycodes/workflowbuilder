# How to change CSS tokens?

`@workflowbuilder/ui` resolves colors, spacing, and radii through generated
`--wb-ds-*` design tokens defined in `@workflowbuilder/ui/tokens.css` and
hand-authored `--wb-public-*` component overrides. Its shipped defaults live
inside the `ui.base` cascade layer, so a plain unlayered override in your own
stylesheet always wins - import order does not matter.

## Consuming from npm (SDK or UI package)

Override the variables you care about on `.workflow-builder-root` in any stylesheet
of your app (primitive tokens such as `--wb-ds-colors-*` also work on `:root`):

```css
.workflow-builder-root {
  --wb-ds-components-button-solid-primary-default: #0f62fe;
  --wb-ds-ui-bg-inset: #f4f4f4;
  --wb-public-date-picker-dropdown-background: #fff;
}
```

Discover design-token names in `node_modules/@workflowbuilder/ui/dist/tokens.css`
and UI component overrides in `node_modules/@workflowbuilder/ui/dist/index.css`.
UI component pages also include generated tables for component-local variables.
Theme-specific values are keyed on `[data-wb-theme='light' | 'dark']`, which sits on
the same element, so write `.workflow-builder-root[data-wb-theme='dark'] { … }` for an
override that should apply to one theme only.

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
