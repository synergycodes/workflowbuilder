# @workflowbuilder/ui-tokens

Private design-token build for `@workflowbuilder/ui`. Turns Figma-exported tokens into the
`--wb-ds-*` CSS variables the component library ships (light/dark themes + primitives).

Not published to npm (`private: true`); consumed only as a workspace build step.

## How it works

1. `tokens.json` - raw token export from Figma (via Tokens Studio), checked into the repo.
2. `src/manifest.ts` - validates `config.ts` against the `tokens.json` exports and derives
   every file path once; all later steps consume the manifest instead of re-deriving names.
3. `src/eject-tokens.ts` - splits `tokens.json` into one JSON file per theme/primitive set
   under `dist/tokens/`.
4. `src/tokens-to-css.ts` - runs each set through [Style Dictionary](https://styledictionary.com/)
   (with `@tokens-studio/sd-transforms`) to emit `dist/<theme>.css` files. Canvas is scoped
   to `:root`; Tokens and Effects are scoped to `html[data-theme='light']` or
   `html[data-theme='dark']`. Font-size, space, radius, and size primitives are emitted in rem.
   A broken token reference fails the build (`brokenReferences: 'throw'`).
5. `src/generate-css-bundle.ts` - inlines the primitive and theme CSS into a single
   self-contained `dist/tokens.css` (no `@import`, so the file survives being copied out
   alone).

`config.ts` declares which primitive and theme sets get processed, using set names exactly
as `tokens.json` exports them (e.g. `Tokens/Dark`); a name mismatch fails the build with
the available keys listed.

`packages/ui`'s build copies `dist/tokens.css` out of this package's `dist/` and re-exports
it as `@workflowbuilder/ui/tokens.css` - see
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

## Token usage lint

```bash
pnpm lint:styles
```

Stylelint (root `.stylelintrc.mjs`) validates workspace CSS with two rules,
both errors:

1. `csstools/value-no-unknown-custom-properties` — every `var(--name)` must
   resolve to a definition that actually exists. The definition set is built
   by `tools/stylelint/custom-properties.mjs`: the token dist plus every
   custom-property declaration in `packages/*/src` and `apps/*/src` CSS.
   Catches prefix typos and drift after a token export update. Variables set
   at runtime from JS (Base UI's `--anchor-width`, inline-style bridges) have
   no CSS definition by design — their usage sites carry a
   `stylelint-disable-next-line` comment with the reason.
2. `wb/no-system-token-fallbacks` (`tools/stylelint/no-system-token-fallbacks.mjs`)
   forbids fallbacks on `var(--wb-ds-…)`, `var(--wb-sdk-…)`, or
   `var(--wb-public-…)` properties; a fallback silently masks exactly the typos
   rule 1 exists to catch. The public font-family variables are the only
   exceptions and REQUIRE fallbacks so standalone component CSS remains usable
   without their default definitions. Genuine exceptions for other tokens use
   the standard mechanism with a mandatory reason:
   `/* stylelint-disable-next-line wb/no-system-token-fallbacks -- reason */`.

Runs in CI (`pr-check.yml`, after `pnpm build:ui`), per-file from lint-staged
on commit, and as part of `pnpm check`. Requires a built `dist/` (created by
`pnpm install` and `pnpm build:ui`). `apps/docs` is excluded via `ignoreFiles`,
consistently in every mode.

Tokens the design file does not export yet are defined provisionally right in
the stylesheet that consumes them (with a comment marking them for removal
once the export lands) — the collector picks source-CSS definitions up
automatically.
