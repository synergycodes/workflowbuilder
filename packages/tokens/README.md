# @workflowbuilder/ui-tokens

Private design-token build for `@workflowbuilder/ui`. Turns Figma-exported tokens into the
`--ax-*` CSS variables the component library ships (light/dark themes + primitives).

Not published to npm (`private: true`); consumed only as a workspace build step.

## How it works

1. `tokens.json` - raw token export from Figma (via Tokens Studio), checked into the repo.
2. `src/manifest.ts` - validates `config.ts` against the `tokens.json` exports and derives
   every file path once; all later steps consume the manifest instead of re-deriving names.
3. `src/eject-tokens.ts` - splits `tokens.json` into one JSON file per theme/primitive set
   under `dist/tokens/`.
4. `src/tokens-to-css.ts` - runs each set through [Style Dictionary](https://styledictionary.com/)
   (with `@tokens-studio/sd-transforms`) to emit `dist/<theme>.css` files scoped to
   `html[data-theme='light']` / `html[data-theme='dark']`. A broken token reference fails
   the build (`brokenReferences: 'throw'`).
5. `src/generate-css-bundle.ts` - inlines the primitive and theme CSS into a single
   self-contained `dist/tokens.css` (no `@import`, so the file survives being copied out
   alone).

`config.ts` declares which primitive and theme sets get processed, using set names exactly
as `tokens.json` exports them (e.g. `Tokens/Dark`); a name mismatch fails the build with
the available keys listed.

`packages/ui`'s build copies `dist/tokens.css` (and the primitive CSS files) out of this
package's `dist/` and re-exports them as `@workflowbuilder/ui/tokens.css` - see
`packages/ui/vite.config.mts`.

## Build

```bash
pnpm --filter @workflowbuilder/ui-tokens build
```

Runs the pipeline above and writes everything to `dist/`. Also runs automatically as this
package's `prepare` script, and as the first step of `pnpm build:ui` / `pnpm build:lib` at
the repo root.

## Test

```bash
pnpm --filter @workflowbuilder/ui-tokens test
```

Vitest unit tests (currently `src/to-file-name.spec.ts` and `src/manifest.spec.ts`).
