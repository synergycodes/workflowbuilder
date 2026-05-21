### Title: Audience-based docs IA + schema authoring reference

### Proposed by: Jakub Skibiński

### Date: 30.04.2026 (revised 04.05.2026 after team review)

> **Status: archival.** References below to `createWorkflowBuilder({...})` describe the public API as of the decision dates. Superseded by `refactor/wb-root-context` — the SDK entry point is now `<WorkflowBuilder.Root>`. The docs IA decisions (audience-based navigation, guides vs. API reference split, schema-authoring section) remain in force; only specific code-snippet references are stale. See current docs site for post-refactor examples.

## Context

After the typedoc-api-reference work landed (15 commits earlier on this same branch), the docs site grew an auto-generated `/api/` section catalogue of every public symbol. The narrative side of the site — `/sdk-api/`, `/how-to/`, `/integration/`, `/overview/quick-start/` — kept the structure it had before that change, and three problems became obvious to anyone using the site cold:

1. **`/sdk-api/` mixed reference with tutorials.** The page set was `index.md` (install + theming + side effects), `create-workflow-builder.md` (config-table walk-through), `editor.md` (low-level prop list), `plugin-api.md` (registration recipe), `jsonforms-extensions.md` (renderer recipe), `custom-node-example.md` (full Webhook walk-through), `types-and-limits.md` (type-list + roadmap). Three different document genres — install-guide, lookup-reference, recipe — under one section header. With `/api/` shipping THE reference, the boundary between `sdk-api` and `api` was fuzzy at best.

2. **"Add a custom node" was duplicated.** `/how-to/add-custom-node-type.mdx` and `/sdk-api/custom-node-example.md` both walked through the same task. The second linked to the first with "see also, same concept, monorepo context" — a tell that the split was confusing rather than useful.

3. **First-time integrator had no coherent path.** Install + bootstrap lived in `/sdk-api/index.md`, persistence options in `/integration/`, theming in `/sdk-api/index.md` again, side effects in `/sdk-api/index.md`. A user who just installed the SDK had to bounce across three top-level sections to wire up their first workflow.

A separate gap, surfaced by an old (pre-restructure) task in our backlog: **no single reference for the two halves of a node's declaration** — neither the data layer (`schema.ts` / JSON Schema) nor the UI layer (`uischema.ts`). The SDK ships ~12 control types, 4 layout types, plus a JSON Schema dialect with SDK-specific extensions, but a developer authoring a node had to read source to discover any of it.

## Decision

Seven choices, executed across 15 commits on `feat/typedoc-api-reference`.

### 1. Audience-based section layout

Top-level sidebar groups now map to who's reading and what they need:

| Section            | Audience                                    | Content                                                          |
| ------------------ | ------------------------------------------- | ---------------------------------------------------------------- |
| **Overview**       | Evaluator ("is this for me?")               | What is WB, features, architecture                               |
| **Get Started**    | First-time integrator ("how do I ship v1?") | Quick Start, Install & peers, Persistence, Theming, Side effects |
| **Guides**         | Building team ("how do I do X?")            | Recipe-style how-tos + the schema authoring reference            |
| **Plugins**        | Building team                               | Per-plugin pages (avoid-nodes-edges, copy-paste, …)              |
| **Built-in Nodes** | Building team                               | Per-node demo pages                                              |
| **API Reference**  | Building team                               | Auto-generated type catalogue                                    |
| **Videos / FAQ**   | Mixed                                       | (Unchanged)                                                      |

The five-section narrative half (Overview / Get Started / Guides / Plugins / Built-in Nodes) reads top-to-bottom as a user journey. API Reference is a sibling reference catalogue, separate from "Guides" by design — recipes and reference don't mix in the sidebar tree, even when they document the same code path.

**Why not keep `/sdk-api/` as an umbrella for both reference and recipes:** the auto-generated `/api/` already does the reference job better than any hand-maintained list ever did, so duplicating that surface as `/sdk-api/` was net negative. Recipes that lived in `/sdk-api/` were never primarily about the API — they were about how to use it — and belong with the other recipes in Guides.

**How to apply:** when adding a new docs page, ask "who's reading this and where in the journey?" first, then place it. A new persistence strategy goes under Get Started > Persistence; a new "how to do X" goes under Guides; a new built-in plugin gets a page under Plugins.

### 2. `/sdk-api/` is gone — its contents redistributed

| Old path                                     | New path                                 | Why                                                                  |
| -------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| `/sdk-api/index.md` (install + peers)        | `/get-started/install/`                  | Onboarding belongs in Get Started.                                   |
| `/sdk-api/index.md` (theming)                | `/get-started/theming/`                  | Theming is a configuration step, not a separate concern.             |
| `/sdk-api/index.md` (side effects)           | `/get-started/side-effects/`             | First-time integrator needs to know about immer + i18next.           |
| `/sdk-api/types-and-limits.md` (limitations) | `/get-started/side-effects/`             | Limitations live next to side effects — same audience, same context. |
| `/sdk-api/types-and-limits.md` (type list)   | (deleted)                                | Redundant with `/api/_readme.md`.                                    |
| `/sdk-api/types-and-limits.md` (roadmap)     | (deleted)                                | Doesn't belong in consumer docs; lives in commits / changelog.       |
| `/sdk-api/create-workflow-builder.md`        | `/guides/configuring-the-editor/`        | It was always a recipe — title + intro updated to match.             |
| `/sdk-api/editor.md`                         | `/guides/use-editor-directly/`           | Same — recipe-style title.                                           |
| `/sdk-api/plugin-api.md`                     | `/guides/build-a-plugin/`                | Same.                                                                |
| `/sdk-api/jsonforms-extensions.md`           | `/guides/custom-jsonforms-control/`      | Same.                                                                |
| `/sdk-api/custom-node-example.md`            | merged into `/guides/add-a-custom-node/` | See decision 3.                                                      |

Every relocated page got its frontmatter title rewritten to a recipe-style verb-leading sentence ("Configuring the editor", "Build a plugin", "Custom JsonForms control") rather than the API-surface name it had before.

### 3. Two "Add a custom node" pages collapsed to one

`/how-to/add-custom-node-type.mdx` and `/sdk-api/custom-node-example.md` walked through the same task with two different demo paths (in-repo `palette.ts` array vs. external `createWorkflowBuilder({ nodeTypes })`). Merged into a single `/guides/add-a-custom-node.mdx` that:

- Leads with the factory path (the standard for external apps).
- Mentions the monorepo `palette.ts` path in one paragraph at the bottom of the registration step (the demo's reality).
- Keeps the YouTube embed + file-paths disclaimer from the old how-to.
- Keeps the Webhook example + custom-renderer section + "what's happening under the hood" from the old custom-node-example.

Result: one tutorial covering both audiences, ~270 lines instead of two pages × ~150 lines + the cognitive cost of cross-references.

### 4. Schema authoring reference lives inside Guides

A node has two declarative halves — a JSON-Schema-shaped `schema.ts` (data layer) and a JsonForms-shaped `uischema.ts` (visual layer). Four hand-written pages cover both, slotted as flat siblings in `Guides` right after the `Add a custom node` recipe:

| Page                              | Path                         | `sidebar.order` |
| --------------------------------- | ---------------------------- | --------------- |
| **Add a custom node** (recipe)    | `/guides/add-a-custom-node/` | 1               |
| **Data schema reference**         | `/guides/data-schema/`       | 2               |
| **UISchema reference** (overview) | `/guides/uischema/`          | 3               |
| **UISchema — Controls**           | `/guides/uischema-controls/` | 4               |
| **UISchema — Layouts**            | `/guides/uischema-layouts/`  | 5               |

**Data schema reference** documents the field types JSON Schema offers (`string` / `number` / `boolean` / `array` / `object`), the validation keywords (`required`, `pattern`, `format`, …), the SDK's `options` extension for select-style fields, and the `NodeDataProperties<typeof schema>` inference path.

**UISchema reference** catalogues every built-in element type from `packages/sdk/src/types/{controls,layouts,labels}.ts` with required props, optional props, and a copy-pasteable example. Split across three pages because the catalogue is long and `/uischema-controls/` and `/uischema-layouts/` are read independently far more often than the `/uischema/` overview.

**Why inside Guides, not as a top-level "Schema Reference" section:** in practice readers reach for these pages while writing `schema.ts` or `uischema.ts` — a _recipe_ activity continuous with `Add a custom node`. A separate top-level section forces a reader following the recipe to leave Guides for a control-type lookup, then come back. Co-locating in Guides removes that bounce; the prefix-grouped filenames (`uischema*`) keep the four pages adjacent in the sidebar.

**Why hand-written, not auto-generated from the type union:** the schemas in source are TypeScript shape declarations — they don't carry the prose a reference page needs ("renders a calendar picker bound to a Date string", "use this for advanced sections that shouldn't crowd the default view", "`format: 'uri'` is validated client-side"). Generating from source would produce field tables without context. Hand-writing is one-off effort + a maintenance commitment; the type union changes ~once per quarter, so the maintenance cost is acceptable.

**Why flat files, not a nested subgroup:** Astro Starlight's `autogenerate: { directory: 'guides' }` works against flat files only — nesting would require switching the whole `Guides` section to a hand-maintained `items` array. The four pages are already prefix-grouped by filename, so the alphabetical sort keeps them adjacent without a manual list.

**Cost paid:** every guide's `sidebar.order` got an explicit unique value (1, 6–11) so the four new pages (2–5) slot in deterministically. Without unique values Starlight tie-breaks alphabetically, which would scatter the cluster across the section.

**How to apply:** when adding a new control / layout / label type to `packages/sdk/src/types/`, or a new SDK extension to the data-schema dialect, add a matching section under the relevant page in `/guides/`. Without this, the type ships invisibly to consumers.

### 5. No URL redirects — every internal link rewritten

The audience-based IA changes ~30 URLs. Two ways to handle that:

- **Redirects** — old URL → new URL via `astro.config.mjs#redirects`. Preserves external-link backwards compatibility (blog posts, Slack threads, bookmarks).
- **Direct rewrite** — every internal `/sdk-api/...`, `/how-to/...`, `/integration/...` link in the docs tree gets rewritten to its new path; no redirects.

Picked **direct rewrite**, per explicit decision in the rollout plan. Reasoning:

- The docs site is the only consumer of these URLs that we control. Slack / blog / bookmark links can be wrong forever — short of a full audit of every place we've ever linked, we can't make them all right.
- Redirects are debt: they accumulate, get forgotten, and quietly degrade to 404s when the rewrite chain breaks. A single audit + rewrite pass is cheaper than five years of maintaining redirect tables.
- The signal "this page moved" is more useful when surfaced as a 404 than hidden behind a 301 — the 404 page links back to the new IA, which means a stale external link tells the reader explicitly that the docs got reorganised.

**Cross-link sweep coverage:** ~30 hand-written pages had `/sdk-api/`, `/how-to/`, `/integration/`, or (later) `/uischema-reference/` references. All rewritten in the same commit as the file move that triggered the rename. Plus one TSDoc comment in `packages/sdk/src/features/diagram/nodes/workflow-node-template/workflow-node-template.tsx` that hardcoded the old how-to URL.

**How to apply:** when moving a docs page, run `grep -rE '/<old-path>/' apps/docs/src` and rewrite every match in the same commit. Don't add a redirect.

### 6. Persistence as a nested sidebar group

`Get Started > Persistence > {localStorage, REST API, via callback}` instead of three siblings under "Get Started". Three pages on the same concept (where does the editor read / write data) clustered under their concept name reads more cleanly than three sibling top-level entries.

The page filenames also got renamed away from internal SDK terminology:

| Old path                      | New path                                 |
| ----------------------------- | ---------------------------------------- |
| `/integration/local-storage/` | `/get-started/persistence/localstorage/` |
| `/integration/external-api/`  | `/get-started/persistence/rest-api/`     |
| `/integration/through-props/` | `/get-started/persistence/callback/`     |

`through-props` is an SDK implementation term (the wrapper component is `withIntegrationThroughProps`); `callback` is what the consumer actually does (passes a callback). `external-api` was ambiguous (external to what?); `rest-api` is the protocol that strategy uses. `local-storage` collapses to `localstorage` to match `localStorage` JS spelling.

**How to apply:** new persistence strategies go under `/get-started/persistence/<strategy-name>/`. Pick names from the consumer's vocabulary, not the SDK's internal one.

### 7. SDK API category `JsonForms` renamed to `UISchema`

The three SDK symbols originally tagged `@category JsonForms` (`getScope`, `DynamicCondition`, `ComparisonOperator`) are exclusively about authoring UISchemas — `getScope` builds JsonPointer scopes for `uischema.ts`, and the other two are operand types for the `DynamicConditions` / `DecisionBranches` controls. The old category name advertised the underlying framework instead of the consumer-facing concept.

Retagging to `@category UISchema` moves the auto-generated TypeDoc folder from `/api/jsonforms/` to `/api/uischema/`, which now sits next to the hand-written `/guides/uischema*/` pages — the API reference and its narrative companion share the same name and sit one click apart in the search.

**How to apply:** any new symbol that exists to support UISchema authoring (control elements, scope helpers, condition types) gets `@category UISchema`. Anything tied to JsonForms registry mechanics (renderers, cells, plugin entry points) keeps `@category Plugins`.

## Commit-by-commit map

```
A1  docs: rename overview/quick-start -> get-started/quick-start
A2  docs: split sdk-api/index into get-started install/theming/side-effects
A3  docs: move integration/* into get-started/persistence/*
B1  docs: rename how-to/ to guides/
B2  docs: merge add-custom-node-type + custom-node-example into guides/add-a-custom-node
B3  docs: relocate jsonforms-extensions + plugin-api into guides
B4  docs: relocate create-workflow-builder + editor into guides
C1  docs: drop sdk-api/types-and-limits
C2  docs: drop SDK API sidebar entry
D1  docs(sdk): repoint WorkflowNodeTemplateProps TSDoc link
E1  docs: UISchema reference landing page
E2  docs: UISchema reference - Controls
E3  docs: UISchema reference - Layouts
F1  docs: docs-restructure decision log
G1  docs: fold UISchema reference into Guides + add data-schema reference + retag JsonForms category as UISchema    (this commit)
```

The E1–E3 commits originally placed the UISchema reference as a top-level sidebar section; G1 collapses that into Guides and adds the matching `data-schema` page. Each move-commit is otherwise self-contained: physical file move + content tweaks + every cross-link rewrite triggered by the move, in one commit. No commit leaves the docs build broken or with dead internal links.

## Verified

The build itself is the gate. Three checks run on every commit on the branch and on every CI build:

- `pnpm build:docs` exits clean — strict-mode TypeDoc has a TSDoc on every public symbol, every internal hand-written link resolves, every page renders.
- `node scripts/check-sidebar-categories.mjs` exits clean — every `@category` tag in the SDK source has a matching sidebar entry (incl. the renamed `UISchema`).
- Every internal `/sdk-api/...`, `/how-to/...`, `/integration/...`, `/uischema-reference/...`, `/api/jsonforms/...` link in `apps/docs/src` resolves to a page that exists on the new IA — verified via final `grep` (only matches left are inside this decision log, describing prior states).

Absolute counts (page count, category count) drift as the surface evolves; the verifier in both cases is the corresponding command exiting non-zero, not a number this document can keep current. The auto-generated `/api/` reference is unchanged in content; the `JsonForms → UISchema` rename only affects the folder name and sidebar label, not the symbols themselves.

## Deferred

- **Hackathon-specific docs** — recipe pages for conditional fields, variable picker, and "build a Hello World plugin" were proposed alongside this restructure but kept out of scope. They land as a separate effort closer to the hackathon date, on a separate branch.
- **Per-built-in-node detail pages** — the `/nodes/` section currently summarises each demo node; a future expansion could dump each one's `schema` + `uischema` for reference. Out of scope today; the schema authoring reference covers the element-type catalogue, which is the more reusable surface.
- **`@since` plugin in TypeDoc** — still on the `typedoc-api-reference.decision-log.md` deferred list. Lands when the SDK gets its first published version.
