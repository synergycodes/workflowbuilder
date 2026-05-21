# @workflowbuilder/sdk — Decision Log

> **Superseded — archival.** This log captures Phase 1 of the SDK work — when
> the package lived at `apps/sdk/` as a thin facade that re-exported from
> `@workflow-builder/demo/app/*` via tsconfig paths. Most specifics below
> (file locations, package structure, build pipeline, known limitations) have
> changed. See [`sdk-restructuring.decision-log.md`](./sdk-restructuring.decision-log.md)
> for the Phase 2 + Phase 3b decisions that further reshape this document.
> Phase 4 (`refactor/wb-root-context`) then removed the `createWorkflowBuilder`
> factory and the `<Editor />` component entirely — the SDK entry point is now
> `<WorkflowBuilder.Root>`. References below to `Editor`, `createWorkflowBuilder`,
> `WorkflowBuilderConfig`, `WorkflowBuilderInstance` describe symbols that no
> longer exist; see current SDK exports in `packages/sdk/src/index.ts` for the
> post-refactor surface. The notes are retained for historical context only.

## Context

Workflow Builder (WB) is a monorepo SPA. To embed it in external React apps, users previously had two options: copy ~500 source files and rewrite imports, or depend on the SPA source via `@workflow-builder/demo/*` tsconfig paths (only works inside the monorepo or a git subrepo).

Goal: ship WB as a pre-built npm package (`@workflowbuilder/sdk`) so consumers can install and use it with a few lines of code, in any bundler, without monorepo setup.

## Package split

- `apps/demo` — SPA + source of truth for all WB code.
- `apps/sdk` — public API facade. Source contains:
  - Extracted types and utils that used to live under `apps/demo/src/app/features/json-form` and `apps/demo/src/app/data/nodes/shared` (see `src/types/`, `src/node/`, `src/utils/`).
  - Thin re-export shims under `src/components/` that re-export `Editor` and `createWorkflowBuilder` from `@workflow-builder/demo/app/...` (monorepo consumers use these raw `.ts` files).
  - `src/index.ts` — library build entry point. Bundled by `vite.config.mts` into `dist/` as a distributable ESM package with CSS.

The SDK keeps two consumption modes on a single package:

- **Monorepo / subrepo** — import specific paths: `import { UISchema } from '@workflowbuilder/sdk/types/uischema'`. Uses `"./*": "./src/*.ts"` exports entry. No build step needed.
- **External npm** — import from package root: `import { createWorkflowBuilder } from '@workflowbuilder/sdk'`. Resolves via `"."` exports entry to `./dist/index.js`. Requires `pnpm --filter @workflowbuilder/sdk build:lib`.

## Key decisions

### 1. Library build in the SDK package, not frontend

**Decision:** The Vite library build lives in `apps/sdk/` (not `apps/demo/`).

**Why:** `apps/sdk/` is already the public API facade. Putting the build there keeps the SPA (`apps/demo/`) unchanged and untangled from library concerns. The SDK entry (`src/index.ts`) re-exports from `@workflow-builder/demo/app/*` via Vite aliases that mirror the tsconfig paths.

### 2. External vs bundled dependencies

**Decision:**

- **External (peer deps):** `react`, `react-dom`, `react/jsx-runtime`, `@xyflow/react`.
- **Bundled:** everything else (zustand, overflow-ui, i18next, jsonforms, immer, etc.).

**Why:** React and ReactDOM must be singletons — two copies cause "Invalid hook call" errors. `@xyflow/react` is externalized because consumers may need to interact with ReactFlow directly (e.g., `ReactFlowProvider`). Everything else is an implementation detail the consumer shouldn't manage.

### 3. CSS bundling strategy

**Problem:** Vite library mode doesn't automatically extract CSS from bundled `node_modules`. Without intervention, the output `style.css` was missing:

- `@xyflow/react/dist/style.css` (externalized, so CSS skipped entirely).
- `@synergycodes/overflow-ui/dist/index.css` (component styles — buttons, panels, nodes).

The overflow-ui package's `exports` field only maps `./tokens.css`, not `./dist/index.css`, so a direct import like `@synergycodes/overflow-ui/dist/index.css` fails with "Missing specifier" error.

**Solution:** `src/index.css` explicitly `@import`s all required CSS, with a Vite alias (`overflow-ui-css`) to bypass the overflow-ui exports restriction:

```css
@import '@xyflow/react/dist/style.css';
@import '@synergycodes/overflow-ui/tokens.css';
@import 'overflow-ui-css'; /* alias → node_modules/@synergycodes/overflow-ui/dist/index.css */
```

### 4. CSS layer ordering

**Problem:** The `@layer reset, ext-lib, ui;` declaration from the frontend's `global.css` must appear first in the output CSS. If overflow-ui's `@layer ui.base,ui.component;` comes first, it establishes a different layer order, breaking cascade precedence for the entire stylesheet.

**Solution:** `src/index.css` declares the layer order at the very top before any `@import` statements.

**Note on consumer CSS resets:** We considered stripping `@layer` wrappers from the output CSS so consumer `* { padding: 0 }` resets could not override library styles (unlayered CSS always beats layered CSS). We ultimately decided against it — requiring consumers to avoid aggressive global resets is an acceptable trade-off, and stripping layers changes internal cascade behavior in ways that are hard to verify.

### 5. `import.meta.env` compatibility

**Problem:** Three files used `import.meta.env` (Vite-specific, statically replaced at build time). In library mode, the consumer's bundler doesn't know about WB's env variables.

**Changes:**

| File                                               | Before                                    | After                                      | Rationale                                                                  |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `apps/demo/src/app/store/store.ts`                 | `import.meta.env.DEV`                     | `process.env.NODE_ENV !== 'production'`    | Standard convention, works in all bundlers                                 |
| `apps/demo/src/app/plugins/analytics/analytics.ts` | `import.meta.env.VITE_CLARITY_PROJECT_ID` | `import.meta.env?.VITE_CLARITY_PROJECT_ID` | Optional chaining — returns `undefined` in non-Vite envs, analytics no-ops |
| `apps/demo/src/app/plugins/analytics/dealfront.ts` | Same pattern                              | Same fix                                   | Same rationale                                                             |

### 6. Type declarations

**Problem:** `vite-plugin-dts` generated `.d.ts` files with broken paths — circular self-references and workspace-relative paths that don't exist in a consumer's `node_modules`.

**Decision:** Use `tsc --emitDeclarationOnly` for the SDK entry (types live in `src/types`, `src/node`, `src/utils`, and re-exports from `@workflow-builder/demo/app/*` are resolvable via tsconfig paths). When building the library, a separate `tsc` invocation emits `.d.ts` files alongside the bundled JS.

If type generation proves brittle, the fallback is a hand-written `dist/index.d.ts` that inlines the small public API surface.

### 7. Plugin API export

**Decision:** Export the existing plugin registration functions (`registerComponentDecorator`, `registerFunctionDecorator`, `registerPluginTranslation`) from the library entry point.

**Why:** WB already has a mature plugin system with decorator/adapter patterns, priority ordering, and named deduplication. Exposing it allows consumers to extend WB without forking:

- Add custom toolbar buttons (`OptionalAppBarControls`).
- Add custom node content (`OptionalNodeContent`).
- Add provider components (`OptionalHooks`).
- Modify component props via `modifyProps`.
- Intercept function calls with before/after decorators.
- Register translations for custom plugins.

### 8. Dual React instance problem (local testing)

**Problem:** When testing locally with `npm install <local-path>`, the consumer's bundler may resolve `react` from the library's own `node_modules` (via symlink) instead of the consumer's `node_modules`. This causes "Invalid hook call — you might have more than one copy of React" errors.

**Solution:** Consumer adds `resolve.dedupe` to their Vite config:

```ts
resolve: {
  dedupe: ['react', 'react-dom', '@xyflow/react'];
}
```

This is a local-testing-only issue. When published to npm, the package doesn't carry its own `node_modules` and React resolves from a single location.

## File structure

```
apps/sdk/
├── src/
│   ├── index.ts                     ← library entry point
│   ├── index.css                    ← CSS aggregation (layer order + external CSS)
│   ├── components/                  ← raw-.ts re-exports (monorepo consumers)
│   │   ├── editor.tsx
│   │   └── create-workflow-builder.tsx
│   ├── node/                        ← extracted node types (was in frontend)
│   ├── types/                       ← extracted shared types (was in frontend)
│   └── utils/                       ← extracted shared utils (was in frontend)
├── dist/                            ← library build output (gitignored)
│   ├── index.js
│   ├── style.css
│   └── index.d.ts
├── vite.config.mts                  ← library build config
├── tsconfig.json
└── package.json                     ← exports, peerDependencies, build:lib script
```

## Build output

```
dist/
├── index.js          ← ESM entry (~4.5 MB, ~1 MB gzipped)
├── style.css         ← all CSS (~210 KB)
├── index.d.ts        ← TypeScript declarations
└── [chunk files]     ← code-split lazy components, icons
```

## Known limitations

- **Single instance per page** — the zustand store is a global singleton. Multiple `<WorkflowBuilder />` instances on the same page would share state.
- **All plugins bundled** — the built-in plugins are always included. No tree-shaking or conditional loading.
- **`libavoid-js` WASM** — the avoid-nodes-edges plugin's WebAssembly module may fail to initialize depending on the consumer's asset serving setup. Non-blocking — edge routing degrades gracefully.
- **Bundle size** — ~4.5 MB uncompressed (~1 MB gzipped). Includes ace-editor, html2canvas, elkjs, and all icon SVGs. Could be reduced by making heavy plugins optional.
