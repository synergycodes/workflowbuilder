### Title: TypeDoc-driven API Reference for `@workflowbuilder/sdk`

### Proposed by: Jakub Skibiński

### Date: 30.04.2026

> **Status: archival.** Anchor symbols listed below (`Editor`, `EditorProps`, `createWorkflowBuilder`, `WorkflowBuilderConfig`, `WorkflowBuilderInstance(Props)`) were the public surface as of 30.04.2026 and were removed in `refactor/wb-root-context`. The TypeDoc pipeline itself is still active and regenerates pages for whatever the current `packages/sdk/src/index.ts` exports — see the live API reference at `/docs/api/` for the post-refactor symbols (`WorkflowBuilder`, `WorkflowBuilderRoot`, `WorkflowBuilderRootProps`, etc.). The narrative below is preserved as historical context for the TypeDoc setup decisions.

## Context

`packages/sdk/sdk-restructuring.decision-log.md` § "Deferred" listed Typedoc API Reference as a follow-up that became non-blocking once `vite-plugin-dts` started bundling the SDK declarations: with a single curated barrel ([packages/sdk/src/index.ts](../../packages/sdk/src/index.ts), § 8 of the same log) plus a single rolled-up `dist/index.d.ts`, TypeDoc has a clean entry to consume.

The brief from the API task author asked for parity with `synergycodes/ng-diagram`'s docs site:

> "An API section, every public type documented, all auto-generated."

ngDiagram uses Astro Starlight + `starlight-typedoc` + `typedoc-plugin-markdown`. Our `apps/docs` is already on Starlight ([apps/docs/astro.config.mjs](./astro.config.mjs)), so the integration is a drop-in.

This log records the choices for the first installation and the iteration plan to reach 100% TSDoc coverage of the SDK's public surface.

## Decision

Five choices, ordered by where they live in the build.

### 1. Tooling: `starlight-typedoc` over a hand-rolled TypeDoc step

`starlight-typedoc@^0.21.5` runs `typedoc` + `typedoc-plugin-markdown` inside Astro's `config:setup` hook — no separate prebuild script, no `typedoc.json` file, watch mode lives next to `astro dev`. Same setup ngDiagram uses.

Versions installed in [apps/docs/package.json](./package.json):

- `starlight-typedoc@^0.21.3` (resolved 0.21.5 — peer ranges: Starlight ≥0.32, TypeDoc ≥0.28, typedoc-plugin-markdown ≥4.6)
- `typedoc@^0.28.9`
- `typedoc-plugin-markdown@^4.8.0`

ngDiagram also bundles `typedoc-plugin-frontmatter` next to this stack to support a custom `@since` plugin (`since-frontmatter.mjs`) that lifts version tags into page frontmatter. We don't ship that plugin today (the SDK is still `0.0.0` private — per-symbol `@since` would be noise), and `knip` rejects unused devDeps in pre-push, so the dep stays out until the `@since` plugin actually lands. Adding it back is one `pnpm add -D` away whenever that work happens.

**Why not a hand-rolled TypeDoc step into `prebuild`:** it's a working pattern, but every consumer of `apps/docs` (CI, `pnpm dev:docs`, `pnpm build:docs`, future preview builds) would need to remember to run it — `starlight-typedoc` collapses that into one config block and gives free `watch: true` integration with `astro dev`.

**How to apply:** when bumping `@astrojs/starlight`, check `starlight-typedoc`'s peer range — its CHANGELOG has had Starlight-version-floor bumps before (0.19 → ≥0.32, 0.21 → ≥0.32 with `typedoc` ≥0.28).

### 2. Plugin import path: default-export, not named

The plugin ships as a **default export**:

```js
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';
```

The published package's `index.ts` (consumed via `package.json#exports['.'] = './index.ts'`) declares `export default function starlightTypeDocPlugin(...)` and named-exports only `typeDocSidebarGroup` and `createStarlightTypeDocPlugin`. Older docs and the ngDiagram code we mirrored use a `{ starlightTypeDoc }` named import — that broke with `(0 , __vite_ssr_import.starlightTypeDoc) is not a function` because there is no named export of that symbol in 0.21.x.

**How to apply:** if a future version reintroduces the named export, both forms can coexist; today only the default-import form works.

### 3. Sidebar router: `category`, with category placement at the source declaration

`typeDoc.router: 'category'` groups the generated pages into folders by the `@category` TSDoc tag — exactly what ngDiagram does and what gives the sidebar its readable shape (Core / Plugins / Integration / Types / …) instead of a flat 80-symbol list.

`@category` tags are placed on the **source declaration** (e.g. `packages/sdk/src/editor.tsx` for `Editor` / `EditorProps`), not at the re-export site in [packages/sdk/src/index.ts](../../packages/sdk/src/index.ts). Two reasons:

1. The barrel re-exports many symbols in compact `export { a, b, c }` blocks; attaching a TSDoc comment to one symbol in such a block is awkward and ESLint-noisy. Splitting every block into one `export` per line just to thread categories through the barrel is a lot of churn for zero behavioural value.
2. TypeDoc resolves `@category` from the comment attached to the original declaration first; placing categories at the declaration is the standard idiom (matches ngDiagram, matches `typedoc-plugin-markdown`'s docs).

**Single-word category names only.** First pass used multi-word names ("Plugin API", "Domain Types"). On disk, `typedoc-plugin-markdown` writes them as `Plugin_API/`, `Domain_Types/` (PascalCase, space → underscore). Astro's autogenerate scan resolves those folder slugs as `plugin_api`, `domain_types` (lowercased, underscore preserved). Both formats are sane in isolation — but mixing them with `starlight-typedoc`'s built-in sidebar generator (see § 6 below) breaks lookup. Settling on single-word names (`Core`, `Plugins`, `Integration`, `Types`, `Other`) sidesteps the underscore/hyphen mismatch entirely and matches ngDiagram's category vocabulary (`Components`, `Directives`, `Services`, `Types`, `Utilities`, …).

PR 1 tagged the 10 highest-traffic symbols in their source files. Everything else falls through to TypeDoc's default `Other` category until PR 2 covers it.

**How to apply:** adding a new public symbol to the SDK barrel? Put `@category <Bucket>` in the TSDoc on the declaration. Reuse an existing single-word bucket name (`Core`, `Plugins`, `Integration`, `Types`, `Other`) before inventing a new one. New categories require a matching sidebar entry in [apps/docs/astro.config.mjs](./astro.config.mjs) — see § 6.

### 4. Coverage rollout: PR 1 lights up the pipeline, PR 2 closes the gap

Doing TSDoc for all ~80 barrel symbols in one PR would have been a 3–4 day push with the build pipeline mocked out the whole time. Splitting:

- **PR 1 (this one):** infrastructure (deps, astro.config block, sidebar wiring, gitignore) + TSDoc for 10 anchor symbols (`Editor`, `EditorProps`, `createWorkflowBuilder`, `WorkflowBuilderConfig`, `WorkflowBuilderInstance`, `WorkflowBuilderInstanceProps`, `WorkflowBuilderPlugin`, `WorkflowBuilderIntegration`, `WorkflowBuilderJsonFormConfig`, `registerComponentDecorator`, `hasRegisteredComponentDecorator`, `ComponentDecoratorOptions`, `registerFunctionDecorator`, `FunctionDecoratorOptions`, `registerPluginTranslation`, `NodeData`, `NodeSchema`). The site builds with `excludeNotDocumented: false` and `treatWarningsAsErrors: false` — undocumented symbols still get a generated page, just without prose.
- **PR 2 (next):** TSDoc + `@category` for the remaining ~65 symbols. End of PR 2 flips both flags to `true`. From that moment any new export to the barrel without a TSDoc comment fails `pnpm build:docs` in CI — no quiet drift.

**Why not flip the flags now:** with ~65 symbols still uncommented, `treatWarningsAsErrors: true` would block every build until PR 2 lands. The site staying up (with placeholder API pages) is more valuable than the strict-mode guarantee in the interim window.

### 5. Sidebar wired manually, not via `typeDocSidebarGroup`

`starlight-typedoc` exports a `typeDocSidebarGroup` placeholder its plugin replaces in-place at `config:setup` time. Tempting (one-line wiring), but **broken with `router: 'category'`**: the placeholder filler walks `reflections.groups`, which TypeDoc populates by **Kind** ("Type Aliases" / "Functions" / "Variables"), and slugifies those into directory names (`type-aliases`, `functions`). The actual on-disk folders, however, are per-category (`Core`, `Plugins`, …) — set by `router: 'category'`. Result: a sidebar group that renders an empty `<ul></ul>` because every autogenerate directory it computed is wrong.

ngDiagram hits the same incompatibility and sidesteps it the same way — manual sidebar entries with explicit `autogenerate: { directory: 'api/<Category>' }` for each category. Our [apps/docs/astro.config.mjs](./astro.config.mjs):

```js
{
  label: 'API Reference',
  collapsed: true,
  items: [
    { label: 'Core',        collapsed: true, autogenerate: { directory: 'api/Core' } },
    { label: 'Plugins',     collapsed: true, autogenerate: { directory: 'api/Plugins' } },
    { label: 'Integration', collapsed: true, autogenerate: { directory: 'api/Integration' } },
    { label: 'Types',       collapsed: true, autogenerate: { directory: 'api/Types' } },
    { label: 'Other',       collapsed: true, autogenerate: { directory: 'api/Other' } },
  ],
}
```

Cost: one extra line per category (~5 lines today). Benefit: deterministic, predictable sidebar order; no surprise empty groups when a category's folder name and TypeDoc Kind diverge; same pattern ngDiagram uses, so SDK contributors familiar with their docs won't get tripped up.

**How to apply:** adding a new `@category Foo` to a source TSDoc requires a matching `{ label: 'Foo', autogenerate: { directory: 'api/Foo' } }` entry in `astro.config.mjs`. Forgetting this manifests as a category whose pages exist but aren't reachable from the sidebar.

### 6. Generated output is gitignored

`apps/docs/src/content/docs/api/` is regenerated on every `astro build` / `astro dev`. Committing the generated Markdown would mean every TSDoc tweak in the SDK shows up as a 5-files-changed diff in `apps/docs/`, making review of SDK changes painful and creating merge conflicts on the generated files. The pattern lives in the **root** [.gitignore](../../.gitignore) — keeping it next to the rest of the project's build-output exclusions rather than starting a per-app `.gitignore`.

**How to apply:** if you need to inspect the generated output locally, run `pnpm build:docs` and look in `apps/docs/src/content/docs/api/`. Don't commit it.

## Configuration reference

The full TypeDoc options block, lifted from [apps/docs/astro.config.mjs](./astro.config.mjs):

```js
starlightTypeDoc({
  entryPoints: ['../../packages/sdk/src/index.ts'],
  tsconfig: '../../packages/sdk/tsconfig.json',
  output: 'api',
  sidebar: { label: 'API Reference', collapsed: true },
  watch: true,
  typeDoc: {
    router: 'category',
    disableSources: true,
    excludeInternal: true,
    excludePrivate: true,
    excludeProtected: true,
    entryFileName: '_readme',
  },
}),
```

- `disableSources: true` — drop the `Defined in <file>:<line>` line from every page. Internal paths (`packages/sdk/src/features/diagram/edges/...`) are noise for an API consumer and tie the docs to the current file structure.
- `excludeInternal` / `excludePrivate` / `excludeProtected` — strip `@internal`-tagged exports, TS `private` / `protected` modifiers. The barrel surface is curated already, but defensive in case a re-export drags in an internal-typed neighbour.
- `entryFileName: '_readme'` — TypeDoc emits a per-package README page by default; the underscore prefix keeps it out of the alphabetical sidebar listing.

## PR 2 — Coverage closes, strict mode flips on

PR 1 left ~70 symbols in `Other/` waiting for TSDoc. PR 2 closes that gap and turns the rollout into a permanent CI guarantee.

### TSDoc + `@category` for the rest of the barrel

Five chunked commits, one per logical region of the public surface:

- **B1 — UI components (~13).** `DiagramContainer`, `EnhancedBaseEdge`, `EdgeLabel`, `LabelEdge`, `SelfConnectingEdge`, `NodeSection`, `OptionalNodeContent`, `ProjectSelection`, `PropertiesBar` (+ `PropertiesBarProps`), `SyntaxHighlighterLazy`, `FormControlWithLabel`, `WorkflowNodeTemplateProps`. Each gets one paragraph explaining what it renders and when a plugin would mount it directly.
- **B2 — hooks (7).** `useEffectChange`, `useFitView`, `useKeyPress`, `useLabelEdgeHover`, `useSingleSelectedElement`, `useChangesTrackerStore`, `trackFutureChange`. The pre-existing block comment on `useSingleSelectedElement` was tightened to the new conventions.
- **B3 — store + listeners + JsonForms helpers (~19).** `useStore` + `getStore*` / `setStore*` family, `openModal`, `addNodeChangedListener` (and siblings for drag-start), `getHandleId`, `NodeChangedListener` type, `getScope` (rewrote stale `/* */` block comment as proper `/** */` TSDoc with `@example`), `ComparisonOperator`, `DynamicCondition`.
- **B4 — utilities + constants + i18n + icons (~15).** `noop`, `statusOptions`, `globalControls`, `generalInformation`, `sharedProperties`, `openInNewTab`, `DeepPartial`, `Prettify`, the four edge constants + `VARIABLE_NODES_KEY`, `TranslationKey`, `Icon` + `WBIcon`. Icon comments live on the re-export sites in `src/index.ts` because TSDoc on the original declarations would require touching `apps/icons` — out of scope for this branch.
- **B5 — remaining domain + integration + plugin types (~21).** `WorkflowBuilderNode`, `WorkflowBuilderEdge`, `NodeType`, `IfThenElseSchema`, `NodeDataProperties` (with `@example`), `UISchema`, `DiagramModel`, `IconType`, `LayoutDirection`, `PaletteItem`, `PaletteItemOrGroup`, `TemplateModel`, `Option`, `IntegrationStrategy` + the rest of the integration shape, `JsonFormsRendererExtension` / `JsonFormsCellExtension` / `PluginTranslationResource`.

Total documented: ~80 public symbols across 13 categories. `Other/` no longer exists on disk after a clean build.

### Editor signature polish

`function Editor({ strategy, … }: EditorProps)` rendered as `Editor(__namedParameters: EditorProps)` on the API page — TypeDoc shows the destructured-pattern's synthetic name when the function destructures inline. Switched to `function Editor(props: EditorProps)` with destructuring inside the body. Cosmetic change: signature now reads cleanly and links to the `EditorProps` page for the prop list. No runtime impact, no consumer-facing change.

### Strict-mode flip

Two TypeDoc options flipped to `true`:

- `excludeNotDocumented: true` — undocumented public symbols are removed from the rendered site.
- `treatWarningsAsErrors: true` — `pnpm build:docs` exits non-zero when any public symbol lacks a TSDoc comment.

Together they make missing documentation a CI-time failure rather than a silent gap. From this commit on, adding a new export to `packages/sdk/src/index.ts` without a TSDoc comment + matching `@category` fails the build.

### Sidebar gains 9 entries, drops `Other`

`apps/docs/astro.config.mjs` adds `Components`, `Hooks`, `Store`, `Listeners`, `JsonForms`, `Utilities`, `Constants`, `i18n`, `Icons` to the `API Reference` group — one entry per category seen during PR 2 commits. `Other` is dropped: with full coverage there's nothing in it. Order is by audience friendliness — Core / Plugins first, reference material (Constants / i18n / Icons) last.

The sidebar still has to be updated by hand whenever a new `@category` appears in source. PR 3 introduces a parity check (`apps/docs/scripts/check-sidebar-categories.mjs`) wired into `pnpm build:docs` to catch the drift automatically.

## Deferred (post-PR 2)

- **`@since` plugin port from ngDiagram.** Useful once the SDK starts shipping versioned releases. Today the SDK is `0.0.0` (private), so per-symbol `@since` tags would just spam frontmatter. Revisit when the SDK gets its first published version.
- **Custom landing page for `/api/`.** TypeDoc's auto-generated `_readme` is hidden today. A hand-written landing page mirroring `sdk-api/index.md`'s structure (sections table + import paths) would close the loop. PR 4.
- **Eventual extraction of `apps/demo/src/app/plugins/*` to `packages/workflow-builder-plugins/`** (cross-references `sdk-restructuring.decision-log.md` § Deferred). When that lands, the plugins package will likely want its own TypeDoc entry — `starlight-typedoc` accepts `entryPoints: [...]` as an array and supports per-entry sidebar groups via `createStarlightTypeDocPlugin()`. Don't reach for that until the plugins package actually exists.
