### Title: SDK restructuring — inversion, relocation, plugin API, config naming

### Proposed by: Piotr Błaszczyk, Jan Librowski, Jakub Skibiński

### Date: 22.04.2026

> **Status: archival.** This log describes the factory-based public API (`createWorkflowBuilder({...})`) that was the SDK entry point as of 22.04.2026. Superseded by `refactor/wb-root-context` — `createWorkflowBuilder`, `Editor`, `WorkflowBuilderConfig`, `WorkflowBuilderInstance(Props)`, and `defineNodeTemplate` are all gone; the entry point is now `<WorkflowBuilder.Root>`. References below describe the world as of the decision date and are intentionally not rewritten — see current SDK exports in `packages/sdk/src/index.ts` for the post-refactor surface.

## Context

Phase 1 of the SDK work shipped `@workflowbuilder/sdk` as a thin facade over `apps/frontend`: the SDK's `src/index.ts` barrel just re-exported `Editor` and `createWorkflowBuilder` from the frontend via `@workflow-builder/frontend/app/*` tsconfig paths and Vite aliases. That worked as a distribution shell but left a mess underneath — "frontend" was simultaneously an SPA and the canonical source of the editor component, and the SDK looked like it was what it wasn't.

The 21.04.2026 API sync settled the follow-ups needed to make the SDK what the name promises: the actual library package, with a clean consumer-facing API. This log records the decisions from that meeting and the shape we implemented on the `feat/sdk-public-api` branch.

## Decision

Six coordinated changes, committed in order to keep the tree typechecking, linting, and building at every step.

### 1. Invert the source-of-truth direction

**Editor source moves from `apps/frontend` to the SDK.** All of `apps/frontend/src/app/{editor.tsx, create-workflow-builder.tsx, app.tsx, features, hooks, store, components, utils}` migrated into the SDK's `src/` tree. The frontend becomes a thin consumer that imports `@workflowbuilder/sdk` like any external consumer would, plus its own demo content (node type definitions, templates, plugins).

**Why:** with the editor living in the SDK, the frontend no longer has a dual role. The SDK consumes its own source internally (no more round-trip through frontend re-exports), and external consumers use the exact same entry points the demo uses. No secret internal API.

**How to apply:** any new WB feature (store slice, diagram behaviour, JsonForms renderer, etc.) belongs under `packages/sdk/src/`. `apps/demo/` is for demo-specific content (example node types, example templates, the bootstrap page).

### 2. Move SDK out of `apps/`

**`apps/sdk → packages/sdk`.** `apps/` now holds only runnable apps (`demo`, `docs`, `icons`, `tools`); `packages/` holds libraries.

**Why:** SDK is a library, not an app. Keeping libraries in `apps/` was a left-over from when everything in the monorepo happened to be an app. Splitting makes the intent visible.

**How to apply:** new libraries go under `packages/`. Update `pnpm-workspace.yaml` if you add a new top-level directory pattern; the base currently globs both `./apps/*` and `./packages/*`.

### 3. Rename `apps/frontend → apps/demo`, delete `apps/wb-demo`

`apps/frontend` is demo-of-the-SDK after the inversion; the name says so. `apps/wb-demo` was the bridge we had built to validate library consumption while the editor still lived in the frontend. After step 1 the bridge is redundant, so it's gone. The package name `@workflow-builder/frontend` became `@workflow-builder/demo`.

**Why:** calling the demo "frontend" stopped being true when it became a consumer. Keeping it would have confused every new contributor reading the repo.

**How to apply:** any CI/Docker reference to `dist/apps/frontend` is now `dist/apps/demo`, and the build-docker.sh and bitbucket-pipelines.yml targets point at `apps/demo/Dockerfile` and `@workflow-builder/demo`.

### 4. Plugin API: factory functions (sync-only)

Plugins used to register themselves via side-effect imports — each `plugin-exports.ts` ran `registerComponentDecorator(...)` at module top level, and the app did `import './plugins-bootstrap'` to force those side effects. That coupled "plugins exist" to "plugins registered" with no way for the consumer to opt out of a specific plugin.

The new API accepts plugin functions through `createWorkflowBuilder({ plugins: [...] })`. Each plugin's `plugin-exports.ts` now `export function plugin()` that wraps its register calls. The demo composes the array explicitly in `apps/demo/src/app/app.tsx`. The `plugins-bootstrap.ts` side-effect file is deleted.

`WorkflowBuilderPlugin` is `() => void`. The factory invokes each plugin synchronously and fully before returning the `WorkflowBuilder` component — there is no async path, no `ready` promise, no two-phase init. Async work (WASM load, fetched config, feature-flag lookup) is consciously **out of scope for the SDK** and is the consumer's responsibility: pre-resolve the data before building the plugin function. An earlier draft of this contract had `() => void | Promise<void>` with the runtime doing `void plugin()` — that combination was a broken contract: the signature invited async, the runtime didn't await it, the plugin registered after the first render, and any thrown error vanished into an `UnhandledPromiseRejection` warning instead of surfacing as a real failure. Removed.

**Why:** zero async plugins exist in the repo today (demo, AI Studio, all of them sync). Adding a `ready: Promise<void>` to the factory return adds three new contract decisions (sequential vs parallel, fail-fast vs continue, plugin metadata) without a real use case to ground them. If a real async case appears, widening `() => void` to `() => void | Promise<void>` later is non-breaking — every existing plugin still type-checks. We design that API when we have a concrete use case to design against, not in the void.

**How to apply:** new plugins export a synchronous `function plugin()` that calls `register*` once and returns. Don't return a Promise — TS will reject it. Don't add side-effect `import './plugin-exports'` lines. If a plugin needs async setup, the consumer awaits it outside the SDK and constructs a sync plugin around the resolved value.

### 5. Config naming: flatten `palette`/`templates`, rename `nodes → nodeTypes`

- `Editor.nodes` → `Editor.nodeTypes` (the prop was always node type definitions, not node instances; `nodes` collided with xyflow's Node and with `initialNodes`).
- `createWorkflowBuilder({ palette: { items } })` → `createWorkflowBuilder({ nodeTypes: [...] })` — the `palette` wrapper object had a single `items` key, providing no value. Same for `templates: { items }` → `templates: [...]`.
- `WorkflowBuilderPaletteConfig` and `WorkflowBuilderTemplatesConfig` types are gone.

A `palette?: {...}` namespace can come back later if we ever add palette UI options (ordering, grouping, search) — but it would be a new namespace, not a wrapper for data.

**Why:** less ceremony, clearer names. `nodeTypes` matches xyflow's terminology for what these objects are.

**How to apply:** pass flat arrays to the factory. `palette` is not a recognized config key.

### 6. `data/palette` and `data/templates` — infrastructure in SDK, defaults in demo (Option B)

The old `data/palette.ts` mixed two concerns: a zustand-style `customPaletteNodes` holder with `setCustomPaletteNodes` + `getPaletteData` (infrastructure), and a hardcoded fallback array pointing at `data/nodes/*` demo content. Same for templates.

The split:

- **SDK keeps** `setCustomPaletteNodes` / `getPaletteData` / `setCustomTemplates` / `getTemplates` (state + plugin-decoratable accessors). The fallback array is empty by default.
- **Demo keeps** the actual node definitions (`data/nodes/*`), template definitions (`data/templates/*`), and thin modules (`data/palette.ts`, `data/templates.ts`) that export `demoPaletteItems` and `demoTemplates`. The demo passes these into `createWorkflowBuilder` so the editor has real data to show.

**Why:** the SDK has no business hardcoding a "trigger, action, delay, conditional, decision, notification, aiAgent" palette — that's one particular consumer's content. Forcing consumers to `setCustomPaletteNodes(null)` to get rid of it was backwards. Option B (throw away the fallback, make the consumer supply node types via config) costs the demo one config line and makes the API honest.

**How to apply:** if the SDK test harness needs a node definition for validation tests, set it up in `beforeAll` via `setCustomPaletteNodes([...])`. Don't add default fallbacks to the SDK's `data/` state holders.

### 7. Build pipeline: rollup-bundled declarations, `sideEffects`

The previous `build:lib` did `vite build && tsc -p tsconfig.lib.json && cp src/index.d.ts dist/index.d.ts` with a hand-maintained `src/index.d.ts` shim. We now use `vite-plugin-dts` with `rollupTypes: true` (which uses `rollup-plugin-dts` under the hood) to roll up all source types into a single `dist/index.d.ts` during the normal `vite build`. The shim is deleted, and so is `tsconfig.lib.json`.

`package.json` declares `sideEffects` for CSS, i18n/plugins-core bootstrap, and `plugin-exports` files — everything else is pure and can be tree-shaken by consumer bundlers.

**Why:** the hand-maintained `index.d.ts` drifts silently when types change in source. Rolling up from source makes drift impossible. Declaring `sideEffects` keeps consumer bundle size honest.

**How to apply:** don't hand-write `packages/sdk/src/index.d.ts` — it doesn't exist any more. Public types are exported from `src/**/*.ts` and picked up automatically. If you add a file with side effects (CSS import, module-level registration), make sure its glob is in `package.json#sideEffects`.

## Scope boundary — what does NOT live in `packages/sdk/`

The SDK ships building blocks. It does not ship concrete business content.

- **Concrete node implementations** (`action`, `delay`, `notification`, `trigger`, `ai-agent`, `conditional`, `decision`) live under `apps/demo/src/app/data/nodes/`. They contain product-specific options ("Hubspot", "CRM System", "Priority: High/Normal/Low") that don't belong in a general-purpose SDK.
- **Concrete templates** live under `apps/demo/src/app/data/templates/`.
- **User-facing plugins** (analytics, validation, avoid-nodes-edges, elk-layout, flow-runner, widgets, download-pdf, copy-paste, undo-redo, reshapable-edges, help, \_\_demo) live under `apps/demo/src/app/plugins/`. The SDK exposes the registration machinery (`registerComponentDecorator`, `registerFunctionDecorator`, `registerPluginTranslation`) and the slot architecture; plugin implementations are consumer-owned.

**Why:** an SDK that hardcodes one team's node types, templates, and plugins is not an SDK — it's a product. Keeping these in demo is what lets an external consumer use `createWorkflowBuilder({ nodeTypes: [...], plugins: [...] })` with their own content, without forking.

**How to apply:** new SDK additions must be framework-level (JsonForms renderer infrastructure, xyflow wiring, i18n machinery, schema helpers like `getScope` / `sharedProperties` / `generalInformation`). Anything answering "what does the Workflow Builder workflow look like for our product" goes into demo.

### 8. Barrel-only public API — plugins and demo consume only `@workflowbuilder/sdk`

Follow-up of section 1 + PR feedback. Before this change, the SDK's `package.json` exports declared a wildcard subpath:

```json
"./*": "./src/*"
```

…which let monorepo consumers reach into SDK internals via `@workflowbuilder/sdk/features/diagram/edges/enhanced-base-edge/enhanced-base-edge` and similar deep paths. Plus a matching tsconfig paths entry and a Vite alias. Plugins used this heavily (200+ deep imports across `apps/demo/src/app/plugins/`), and so did `apps/demo/src/app/data/nodes/*`.

This worked inside the monorepo (tsconfig paths + Vite alias resolved everything), but broke every commercial delivery path:

- **Plugin source code sold to customers** — when a customer pastes plugin source into their own app and installs only `@workflowbuilder/sdk`, deep subpath imports hit SDK raw `.ts/.tsx` files. Those files reference other SDK internals (originally via `@/` alias), reference CSS modules, reach into features that depend on internal store slices — none of which the customer's bundler can untangle without SDK's own Vite alias setup.
- **Package distribution** — a future `@workflow-builder/plugins` package would have to declare its peer contract against moving targets (paths like `features/changes-tracker/stores/use-changes-tracker-store` are not SemVer-stable; any SDK refactor renames them).

The fix is barrel-only consumption. `@workflowbuilder/sdk` is now the single consumer entry point for everything plugins and demo-content need. The curated barrel exposes ~100 public symbols organized into categories (Plugin API, UI components, hooks, store access, diagram listeners, JsonForms helpers, utilities, constants, icons).

Changes:

- **SDK barrel expanded** ([packages/sdk/src/index.ts](./src/index.ts)) with all plugin-used APIs: components (`DiagramContainer`, `LabelEdge`, `EnhancedBaseEdge`, `PropertiesBar`, `ProjectSelection`, `NodeSection`, `OptionalNodeContent`, `SyntaxHighlighterLazy`, `SelfConnectingEdge`, `EdgeLabel`, `FormControlWithLabel`), hooks (`useFitView`, `useKeyPress`, `useEffectChange`, `useChangesTrackerStore`, `trackFutureChange`, `useLabelEdgeHover`, `useSingleSelectedElement`), store access (`useStore`, store selectors/setters, `openModal`), listeners (`addNodeChangedListener` & siblings, `addNodeDragStartListener` & siblings), helpers (`getHandleId`, `getScope`, `generalInformation`, `statusOptions`, `sharedProperties`, `globalControls`, `noop`, `openInNewTab`), constants (`EDGE_CURVE_RADIUS`, `EDGE_OFFSET`, `SELF_CONNECTING_EDGE_LABEL_OFFSET`, `VARIABLE_NODES_KEY`), types (`NodeType` enum, `Option`, `IfThenElseSchema`, `DynamicCondition`, `ComparisonOperator`, `DecisionNodeSchema`, `AiAgentNodeSchema`, `WorkflowNodeTemplateProps`, `PropertiesBarProps`, `TranslationKey`, `NodeData`, `NodeSchema`, `UISchema`, `NodeDataProperties`, `DiagramModel`, `IconType`, `PaletteItem`, `TemplateModel`, `DeepPartial`, `Prettify`), and two aliased schemas (`decisionSchema`, `aiAgentSchema`).
- **Demo rewrite** — 204 deep imports in `apps/demo/src/app/plugins/` and 64 in `apps/demo/src/app/data/` replaced with barrel imports. Duplicate barrel imports merged (67 files in plugins + 16 in data).
- **Escape hatches removed** — `./*: "./src/*"` dropped from `packages/sdk/package.json` exports, `@workflowbuilder/sdk/*` dropped from `tsconfig.base.json` paths, and the `^@workflowbuilder/sdk/(.+)$` regex alias dropped from `apps/demo/vite.config.mts`. A monorepo developer who accidentally writes a subpath import now gets an immediate type/resolve error — parity with external consumers.
- **SDK-internal import convention** — the public escape hatches above are removed; SDK internals are not reachable from outside the package. Inside, source uses the `@/*` alias (defined in `packages/sdk/tsconfig.json` paths and `packages/sdk/vite.config.mts`) for cross-tree imports and relative paths for siblings. The alias is package-scoped and does not leak to consumers — `vite-plugin-dts` with `rollupTypes: true` inlines all internal types into `dist/index.d.ts`. ESLint blocks the `src/*` import pattern (which `tsc` accepts via baseUrl but Vite rejects, so catching it at lint time avoids broken builds). New SDK code uses `@/` for cross-tree imports; existing relative imports stay as-is and migrate opportunistically.
- **Icons bundled into SDK** — `Icon` + `WBIcon` re-exported from SDK barrel, `vite-plugin-dts` configured with `bundledPackages: ['@workflow-builder/icons']` so the rolled-up `dist/index.d.ts` inlines the icon types (no residual `import from '@workflow-builder/icons'`). `apps/icons` emits proper `.d.ts` via `tsc` in its build script so rollup-dts has clean declarations to consume. Consumers don't need to install `@workflow-builder/icons` separately.
- **Explicit type imports enforced** — demo's `tsconfig.json` got `verbatimModuleSyntax: true` and `eslint.config.mjs` gained `@typescript-eslint/consistent-type-imports` with `fixStyle: 'inline-type-imports'`. Without this, a plugin file with `import { WorkflowBuilderEdge }` would emit a runtime import — fine when the consumer's bundler elides types, broken when it doesn't (verbatim resolution, some Webpack configs, older TS). ESLint autofix cleaned 260 type imports in one pass.
- **Orphan plugin-only deps removed from SDK** — `elkjs`, `html-to-image`, `jspdf`, `libavoid-js`, `web-worker` moved out of `packages/sdk/package.json` (demo already declared them). `react-mentions-ts` removed from demo (only SDK uses it). SDK's runtime deps now only reflect what SDK source actually imports.

**Why:** the business model is "plugin sold as source code" + "plugin sold as package". Both paths require the plugin's imports to be resolvable in any consumer app that installs only `@workflowbuilder/sdk`. Internal subpath imports made this impossible. Post-refactor, a plugin file can be pasted into any React app with a `@workflowbuilder/sdk` install and compile cleanly.

**How to apply:** new plugin code — whether in `apps/demo/src/app/plugins/` or (eventually) in a dedicated `packages/workflow-builder-plugins/` — imports only from `@workflowbuilder/sdk`. If a plugin needs something that isn't exported, add it to the barrel deliberately in `packages/sdk/src/index.ts` (and write down the reasoning in the commit). No deep imports. No `@workflowbuilder/sdk/features/...` loopholes. `verbatimModuleSyntax` catches accidental value-imports of types at typecheck time.

### 9. Post-migration fixes surfaced by consumer testing

Two regressions and one gap became visible only once an external consumer app actually embedded the SDK (pasted plugin source + installed `@workflowbuilder/sdk` via local path). Fixing each here rather than letting them propagate to every consumer setup.

- **i18n regression (Phase 3a side-effect).** Plugins used to register translations via module-load side effects, which populated the shared `pluginsResource` before `i18n.init()` read it. Phase 3a moved plugin registration into the `createWorkflowBuilder({ plugins: [...] })` factory call, which executes **after** the SDK module graph has initialized i18next — so `registerPluginTranslation` updates a module-level object that i18next no longer consults. Plugin keys (`plugins.flowRunner.groupFlow`, `plugins.help.helpSupport`, etc.) surfaced as raw strings in the UI. Fix: `registerPluginTranslation` now calls `i18n.addResourceBundle(lang, 'translation', { plugins: ... }, true, true)` in addition to updating `pluginsResource`. Works regardless of when plugins register relative to i18next init.

- **CSS incompleteness — SDK's `index.css` was a partial copy of demo's `global.css`.** Missing `body { margin: 0; background-color: var(--wb-background-color); overflow: hidden; }` rule left consumer apps with a white canvas instead of the tokenized grey background. Missing `@layer ui { @layer base, component; }` sub-layer declaration. Missing Google Fonts `@import` for Poppins left consumers with `sans-serif` fallback (since SDK's font stack was `'Poppins', sans-serif`). All three folded into [`packages/sdk/src/index.css`](./src/index.css). The Poppins `@import` plus a widened fallback chain (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) means consumers get a correct render without wiring up Google Fonts themselves.

- **CSS `@import` ordering.** CSS spec requires `@import` before every other statement except `@charset` and _empty_ `@layer` declarations. The sub-layer block (`@layer ui { @layer base, component; }`) has a body and therefore counts as a statement — it must come **after** all `@import`s. PostCSS flagged this in demo's build. Reordered.

**How to apply:** when extending i18n or CSS from the SDK, remember that i18n plugin registration is now runtime-safe (via `addResourceBundle`), and that `packages/sdk/src/index.css` is the single source of truth for the library CSS bundle — demo's `global.css` is redundant and stays only because it's imported by `main.tsx` alongside the SDK's CSS.

### 10. Code-review follow-ups — `Editor` side effects and `apps/docs` stale refs

Review of the branch surfaced two issues that were not caught during the section 1–9 migration.

- **`Editor` was mutating SDK module state from `useMemo`.** `setCustomPaletteNodes(nodeTypes ?? null)` and `setCustomTemplates(templates ?? null)` were wrapped in `useMemo([nodeTypes])` / `useMemo([templates])`. `useMemo` is a memoisation primitive — React explicitly reserves the right to skip the callback (error-boundary remount, Strict Mode double-invocation, future compiler optimisations), which would leave the palette/template holders out of sync with props. Replaced with unconditional calls at the top of the render. The setters are idempotent and the state is module-level (not React state), so calling on every render is cheap and correct. `useEffect` is the wrong fix here — it runs after commit, which would leave the subtree rendering against stale data on the first paint.

- **`apps/docs` still pointed at deleted source paths.** Three Vite aliases in `apps/docs/astro.config.mjs` resolved against `apps/frontend` and `apps/types`, both removed by sections 1–3. `@wb/nodes` silently returned an empty glob instead of erroring, so the docs build continued to succeed while every node-reference page (`/nodes/action`, `/nodes/decision`, etc.) shipped without its Data Schema / UI Schema tabs. Repointed `@wb/nodes` at `apps/demo/src/app/data/nodes`. Dropped `@/features/json-form` (unused anywhere in docs content) and `@workflow-builder/types` (the two code-example blocks in `add-custom-node-type.mdx` that referenced it were example consumer imports, not build-time imports, and their intended targets now live in the SDK barrel). Two content files (`add-custom-node-type.mdx`, `properties-sidebar.mdx`) and one quick-start (`standalone-app.mdx`) were updated from `apps/frontend/...` paths to `apps/demo/...`; the `@workflow-builder/types/*` imports in example code were rewritten to `@workflowbuilder/sdk`. Top-level `docs/README.md` and `docs/how-to-change-css-tokens.md` got matching path updates; `docs/using-app-as-component.md` describes a pre-SDK workflow that no longer applies and got a deprecation banner pointing at the SDK quick-start.

**Why:** `useMemo` for side effects is a correctness bug waiting to trigger — the fact that it happened to work in development doesn't make it safe. The docs build passing while silently losing half the `/nodes/` page content is worse than a build failure; a failing build would have been caught in CI.

**How to apply:** never use `useMemo`/`useCallback` for side effects. If the state lives outside React (module-level, singleton, etc.), call the setter during render — it's synchronous, ordered before children render, and tolerates Strict Mode double-invocation as long as it's idempotent. When renaming or removing a workspace package, grep for its name across `apps/docs/astro.config.mjs`, `*.mdx`, and top-level `docs/` — Vite aliases don't fail loudly, and content files aren't typechecked.

### 11. Quick-fix round — public API hygiene

Smaller follow-ups from the next review pass. None are architectural; together they tighten the public surface against the same scope-boundary rule (§ "Scope boundary — what does NOT live in `packages/sdk/`") and the project's no-default-export convention.

- **Concrete schemas left the SDK barrel.** `decisionSchema` / `aiAgentSchema` (and their `DecisionNodeSchema` / `AiAgentNodeSchema` types) were exported from `packages/sdk/src/index.ts` and the source files lived under `packages/sdk/src/features/`. Both schemas embed product-specific content — `decisionBranches` with `comparisonOperator` enums, `aiAgent` with `chatModel` / `tools` / `memory` shaped to the demo's AI tooling vocabulary. Per § 6 / § "Scope boundary" that's `apps/demo` content, not building-block content. Schemas moved to `apps/demo/src/app/data/nodes/{decision,ai-agent}/schema.ts` (with the `chatModel` / `memory` `Option[]` arrays inlined locally so the demo schema is self-contained), barrel exports dropped, and the two demo files that previously imported `decisionSchema as schema` / `aiAgentSchema as schema` from the barrel now import from the colocated `./schema` module. The two flow-runner consumers (`plugins/flow-runner/.../decision.ts`, `decision.spec.ts`) that needed the `DecisionNodeSchema` type for `NodeDataProperties<…>` typing were repointed at the same colocated source. The SDK still ships the `DecisionNodeContainer` / `AiNodeContainer` renderers that bind these node types — they're an existing deeper leak (§6 says concrete node implementations belong in demo) but moving the rendering layer too is a larger refactor and out of scope for this round; for typing they now use locally-declared structural property types so they no longer depend on the (now-demo) schemas. The single SDK-internal `AiAgentTool` type, used by the AI tools control infrastructure, was promoted from `NonNullable<NodeDataProperties<AiAgentNodeSchema>['tools']>[number]` to a hand-written object type with the same field shape — the AI tools control is still concrete content but at least it no longer reaches across module boundaries to derive its row type from a schema that no longer lives in this package.

- **Default exports removed.** Repo convention (`frontend.md`) bans `export default` outside `*.config.*`. Three violations: `packages/sdk/src/hooks/use-effect-change.ts` (default function), `packages/sdk/src/store/store.ts` (default `useStore`, with 26 internal call-sites also doing `import useStore from '…'`), and `packages/sdk/src/features/plugins-core/utils/missing-plugin.stub.ts` (a redundant `export default {}` next to the actual `export const plugin`). All three converted to named exports; barrel re-exports rewritten from `export { default as X }` to `export { X }`; the stub's `export default {}` deleted. Internal `import useStore from …` sites converted en-masse via `sed`.

- **`@xyflow/react` peer-dep range tightened.** `>=12.0.0` accepted any future major; replaced with `^12.0.0` to keep semver-major changes from auto-installing into consumer apps without us having validated the SDK against them.

- **CSS body reset documented.** `packages/sdk/src/index.css` resets `body` (`margin: 0`, `background-color: var(--wb-background-color)`, `overflow: hidden`) inside `@layer reset` — the lowest-precedence layer in the SDK's cascade, so consumer rules win without `!important`. The behaviour is still a surprise to a consumer who imports `style.css`, especially the `overflow: hidden` (which prevents page-level scrolling outside the editor). Added a `packages/sdk/README.md` documenting the resets, what they do, and how to override. The README is intentionally minimal — broader consumer docs (install / usage / screenshots) ride on the npm-publish prep that's still deferred.

**Why:** the schema move closes the gap left after § 8 — once the public barrel is curated, anything still in it has to clear the same scope-boundary bar. The default-export cleanup is hygiene against a lint convention that wasn't enforced as a rule. The peer-dep tightening protects consumers against drive-by majors. The README closes the most likely "I imported your CSS and now my page can't scroll" support ticket.

**How to apply:** before adding a new export to `src/index.ts`, ask whether the symbol is a _building block_ or _demo content_; if it parameterises on a concrete product enum (status names, model names, tool names, branch shapes), it belongs in `apps/demo`. New SDK source files use named exports; the lint config catches `export default`. Peer-dep ranges in `packages/sdk/package.json` use caret-ranges, never open-ended `>=`.

## Deferred

- **Paid-plugins package.** Extracting `apps/demo/src/app/plugins/*` (except `__demo` and `help`, which stay as community content) into `packages/workflow-builder-plugins/` is part of the original meeting plan. Section 8 above makes this almost mechanical — every plugin now imports only from `@workflowbuilder/sdk`, so extraction is a directory move plus a `package.json` that declares SDK as peer. When we do extract, the demo will still compose them via `createWorkflowBuilder({ plugins: [...] })` — the only change is the import origin.

- **Plugin WASM/worker asset handling.** `avoid-nodes-edges` depends on `libavoid-js` which ships a WASM binary (`libavoid-js/dist/libavoid.wasm`) that is not exposed via the package's `exports` field — bundlers can't `import` it as an asset URL. Currently the plugin calls `AvoidLib.load('./libavoid.wasm')` and relies on a monorepo-only `fix-worker.ts` script that copies the WASM to `dist/apps/demo/assets/` after build. External consumers (source-code distribution) need a bundler-specific asset-copy step or a `window.__LIBAVOID_WASM_URL__` override mechanism. Not architectural — isolated to one plugin, resolvable via documentation or a per-consumer Vite plugin.
- **Community-build manifest merge.** The `chore/community-build-manifest` branch already has the manifest-based whitelist. Merging it is deferred until this restructuring is fully on `master` so the manifest lands with correct `packages/sdk` and `apps/demo` paths and doesn't have to track a moving target.
- **Typedoc API Reference.** Now that types roll up from source, typedoc has a clean barrel to consume. Not blocking the restructuring.
