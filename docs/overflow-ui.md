# UI library (`@workflowbuilder/ui`)

The UI component library lives in this monorepo at `packages/ui`, published as
`@workflowbuilder/ui`. It is built on [Base UI](https://base-ui.com/) and
provides the components and design tokens the SDK and reference apps render
with. Its design tokens are generated from `packages/tokens`
(`@workflowbuilder/ui-tokens`).

## How is it consumed?

`packages/sdk`, `apps/demo`, and `apps/ai-studio` depend on it via
`workspace:*` and import it as `@workflowbuilder/ui`. Consumers resolve the
built `dist/` through the package `exports` (the SDK's `src/index.css` pulls in
`@workflowbuilder/ui/tokens.css` and `@workflowbuilder/ui/index.css`).

## Working on it locally

`dist/` is git-ignored and rebuilt from source. The `prepare` lifecycle script
of `packages/ui` and `packages/tokens` builds both on `pnpm install`, in
dependency order (tokens first, then ui), so a fresh install is enough for the
apps to resolve the library.

When iterating on the library itself, rebuild after each change:

- `pnpm --filter @workflowbuilder/ui build` - one-shot build (tokens must be
  built first; `pnpm build:ui` does both in order).
- `pnpm --filter @workflowbuilder/ui dev` - rebuild on change (`vite build --watch`).

`pnpm build:lib` builds the full publishable chain (tokens -> ui -> sdk).

## CSS layers

The library emits all styles into two ordered cascade layers
(`@layer ui.base, ui.component;`). See [`packages/ui/css-layers.md`](../packages/ui/css-layers.md)
for the contract and why `styles.css` (or `index.css`) must establish the order
before any component rule.
