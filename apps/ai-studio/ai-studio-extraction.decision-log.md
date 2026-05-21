### Title: Extract AI Studio from `apps/demo` into its own `apps/ai-studio` app

### Proposed by: Kuba Skibiński

### Date: 05.05.2026

> **Status: archival.** This log reflects the pre-`<WorkflowBuilder.Root>` API. Superseded by `refactor/wb-root-context` — `createWorkflowBuilder` removed; entry point is now `<WorkflowBuilder.Root>`. References to the legacy API below describe the world as of 05.05.2026 and are intentionally not rewritten — see current `apps/ai-studio/src/app/app.tsx` for the post-refactor wiring.
>
> **Legacy → current name map** (used throughout the body):
>
> | Legacy (as written below)                                  | Current                                                                                 |
> | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
> | `<WorkflowBuilder>` (JSX element)                          | `<WorkflowBuilder.Root>` / `<WorkflowBuilderRoot>`                                      |
> | `WorkflowBuilderApp` (internal component)                  | folded into `<WorkflowBuilder.Root>` (no separate symbol)                               |
> | `createWorkflowBuilder({ nodeTypes, templates, plugins })` | `<WorkflowBuilder.Root nodeTypes={...} templates={...} plugins={[...]} />`              |
> | `children` of `<WorkflowBuilder>`                          | unchanged — `<WorkflowBuilder.Root>` still accepts JSX children with the same semantics |

## Context

`apps/demo` was conflating two fundamentally different things:

1. **A minimal embed showcase** — "here is how to consume `@workflowbuilder/sdk` with a curated set of plugins (copy-paste, undo-redo, elk-layout, validation, widgets, …) plus the two community-edition plugins (`__demo`, `help`)." Pure-frontend, no backend, no Docker runtime story.
2. **A complete AI workflow product** — AI Studio: an HTTP + Server-Sent Events execution backend, its own node types (`ai-studio/trigger`, `ai-studio/ai-agent`, `ai-studio/decision`), templates, Play/Stop controls, log panel, node detail panel, execution highlighting, per-node markers, a Zustand execution store, SSE adapter, backend hooks, and translations.

These are not the same kind of artifact. An enterprise plugin (copy-paste, validation, …) is a feature that decorates the editor. AI Studio is a complete product use case that happens to compose itself through the plugin API. Registering AI Studio as the 11th plugin in `apps/demo/src/app/app.tsx` made it look like one more decorator, when in reality it owned an entire vertical of the running app.

The practical cost:

- An external reader landing in `apps/demo/` to learn how to embed the SDK had to mentally subtract AI Studio before anything else made sense.
- The `apps/backend/README.md` architecture diagram referenced `apps/frontend/.../plugins/ai-studio` (already a stale path post-rename), framing AI Studio's frontend as a sub-component of demo rather than a peer.
- The plugin registrations themselves were shaped around the conflation. `OptionalAppChildren` slot was used to inject root-level UI (Play controls, log panel, node detail) and `OptionalHooks` to install the highlighting effect — neither of which genuinely needs slot mechanics. `getPaletteData` and `getTemplates` decorators were used to **append to demo's palette** when AI Studio's palette was the entire palette. A `registerPluginTranslation` call shipped `en`/`pl` bundles that no component ever read — the controls hardcoded their English strings. Every layer of the plugin surface was carrying weight that had no functional reason to exist.
- Demo's deployment (static frontend) and AI Studio's deployment (frontend + backend + Temporal worker) were artificially fused.
- Demo's Vite config still proxied `/api` → `http://localhost:3000` for AI Studio's backend calls — a port that no longer matched the backend's actual `3001` even before the split, and dead weight the moment AI Studio talks to its own backend directly.

## Decision

Split AI Studio out into a new top-level app `apps/ai-studio/` that consumes `@workflowbuilder/sdk` like an external user would:

1. **Direct JSX composition for app-shell UI.** `AiStudioControls`, `ExecutionLogPanel`, `ExecutionNodeDetail`, and `ExecutionHighlighting` become children of `<WorkflowBuilder>` rather than `OptionalAppChildren` / `OptionalHooks` decorators. The SDK already supported `children?: ReactNode` on `<WorkflowBuilder>` and renders them as siblings of `WorkflowBuilderApp` inside `RuntimeIntegrationWrapper` — every shell component uses `position: fixed`, so visually identical.
2. **Slim plugin only for what genuinely needs slot mechanics.** A single `plugin()` survives, registering `OptionalNodeContent` for `ExecutionNodeMarkers` (rendered inside each xyflow node). This is the only piece that requires deep structural injection. The `registerPluginTranslation` call is dropped along with `apps/ai-studio/src/locales/` and the `i18next` / `i18next-browser-languagedetector` / `react-i18next` runtime deps — no consumer ever called `useTranslation`, the controls hardcoded English, and re-introducing i18n only makes sense once a real second-language requirement exists.
3. **Direct factory config for nodes and templates.** `aiStudioNodeTypes` and `aiStudioTemplates` are passed directly to `createWorkflowBuilder({ nodeTypes, templates, plugins })`. The `getAiStudioPalette` / `getAiStudioTemplates` callback wrappers (which appended to demo's palette/template lists) are deleted.
4. **Demo stays exactly what it was after AI Studio is removed.** Pure-frontend SPA, same Vite config, same Dockerfile, same deployment. Just smaller and clearer. The dead `/api` proxy in `apps/demo/vite.config.mts` is removed at the same time — demo no longer talks to any backend, and the only remaining `/api/...` mention in demo source is a fully-qualified URL to a public external API in `flow-runner`, which never went through the dev proxy anyway.
5. **Root scripts reflect the new mental model.** Root `dev` defaults to the lightweight `dev:demo` (no infra, no backend, no worker). The full-stack orchestrator is now `dev:ai-studio` (infra:up → infra:wait → backend + worker + ai-studio frontend concurrently). New `build:ai-studio` script alongside existing `build` (still demo).
6. **Backend README recentred on AI Studio as the consumer.** Stale `apps/frontend/.../plugins/ai-studio` reference, the `dev:frontend` script that no longer exists, and the script tables all updated to reflect the new topology.
7. **`localhost` → `127.0.0.1` in env examples and `tools/wait-for-temporal.mjs`.** A direct follow-on from `apps/backend/local-dev-binding.decision-log.md`: that change moved the docker-compose ports and the HTTP server to loopback-only, but left `.env.example` defaults and the Temporal readiness check still spelled as `localhost`. On Windows, `pnpm`-spawned subprocesses can resolve `localhost` to `::1` (IPv6) first, which fails against the docker IPv4 loopback bind — `pnpm dev:ai-studio` would not run cleanly out of the box without this fix. Bundled here because it is the new dev-stack orchestrator that surfaces the issue.

Net effect on the registration surface:

|                                              | Before                               | After                                                               |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| `OptionalAppChildren` decorators             | 3 (controls, log panel, node detail) | 0 — direct JSX children                                             |
| `OptionalHooks` decorators                   | 1 (highlighting)                     | 0 — direct JSX child (renders `null`, installs CSS via `useEffect`) |
| `OptionalNodeContent` decorators             | 1 (node markers)                     | 1 — kept (the slot exists for a reason)                             |
| `getPaletteData` / `getTemplates` decorators | 2                                    | 0 — direct factory config                                           |
| `registerPluginTranslation`                  | 1                                    | 0 — dropped (no consumer)                                           |

## Alternative Options Considered

- **Leave as-is.** Rejected. The conflation is a load-bearing source of confusion — backend README path stale precisely because AI Studio was buried in demo, and the "is this a plugin or a product?" question keeps re-surfacing.
- **Repackage AI Studio as a "premium plugin pack" (multiple plugins, single registration).** Rejected. Same category error. AI Studio is not a feature that decorates an editor — it is a product that uses the editor as a component. Bundling its node types, palette, templates, store, SSE adapter, and runtime backend dependency under "plugin" continues to misframe it.
- **Add new SDK API surface for app-shell composition.** Rejected. The plugin API is explicitly out of scope per `packages/sdk/sdk-restructuring.decision-log.md` §4. We did not need to: `<WorkflowBuilder>` already accepts `children`, and `position: fixed` shell components are unaffected by their position in the React tree.
- **Defer the move and just rename the bad parts in place.** Rejected. The stale README path was a symptom, not the disease. Rename-in-place keeps the conflation.
- **Combined deployment under one domain with a `/ai-studio` route.** Rejected. The two products have different runtime requirements (backend dependency vs static-only) and target different audiences (SDK consumers vs AI workflow product evaluators). Forcing them into one SPA reintroduces the conflation at the deploy layer.
- **Keep the `en`/`pl` translation bundle and wire `useTranslation` in the controls.** Rejected. Four hardcoded English strings ("Execute (backend)", "Cancel execution", "Reset", an unused "name" key) do not justify the i18n runtime, the locale files, or the `registerPluginTranslation` plugin surface. Re-add when there is an actual localisation requirement to satisfy — until then it is dead infrastructure.

## Consequences

- **Pros**
  - **Clear narrative.** `apps/demo` reads as a how-to-embed showcase. `apps/ai-studio` reads as a full product. Either one can be linked in isolation without the reader needing to mentally separate them.
  - **AI Studio proves the SDK is consumable from the outside.** No privileged plugin slots used for app-shell UI; just `createWorkflowBuilder({...}) + JSX`. Whatever an external customer can do, AI Studio does.
  - **Smaller AI Studio bundle.** The build dropped from demo's 7.4 MB main chunk to 1.05 MB for AI Studio (gzipped 326 kB). AI Studio doesn't pull in `elkjs`, `libavoid-js`, `html-to-image`, `jspdf`, `@microsoft/clarity`, `i18next`, etc. — none of which it ever used.
  - **Independent deployment story.** AI Studio + reference backend + worker on one domain; demo stays where it is. Each can fail/deploy without affecting the other.
  - **Demo's dev path becomes lightweight.** `pnpm dev` no longer spins up Postgres, Temporal, the backend, and the worker just to render a frontend. Onboarding contributors start with one command and a browser.
  - **Plugin surface area minimised to what genuinely benefits.** Slot mechanics are now used only for the case (per-node content rendered inside xyflow nodes) where there is no other way to inject. The rest is plain React composition.
  - **`pnpm dev:ai-studio` runs out of the box on Windows.** Loopback-bind defaults plus matching `127.0.0.1` env examples plus the IPv4-explicit Temporal readiness check close the IPv6-resolution foot-gun that the loopback-binding rollout (`apps/backend/local-dev-binding.decision-log.md`) left half-finished.

- **Cons**
  - **Doubled CI/deploy surface in the long run.** Two frontends, two pipelines, two deploy targets. The cost will land. Mitigated long-term by demo staying static-only: only AI Studio carries the heavyweight backend+worker+infra deploy path.
  - **`<WorkflowBuilder>` children render outside `.workflow-builder-root`.** They are siblings of `WorkflowBuilderApp` inside `RuntimeIntegrationWrapper`, not nested inside the styled root container. Currently invisible because every AI Studio shell component uses `position: fixed`. A future shell component that depends on positioning relative to `.workflow-builder-root` will not work as a JSX child — it would need to go through `OptionalAppChildren` instead. Documented here as the constraint.
  - **AI Studio has a hard runtime dependency on the reference backend.** Not a regression (it always did) — but now it is the _only_ artifact in the repo with that dependency, so the contrast is starker. The reference backend's `⚠️ Local development only` warning therefore directly applies to AI Studio specifically.
  - **Demo loses its "AI agent" narrative.** Demo's palette still has its own generic `aiAgent` example node (different `type`: `ai-agent` vs AI Studio's `ai-studio/ai-agent`), but the live execution story moves to AI Studio. Anyone wanting to demo "AI workflows running for real" now points at AI Studio instead of demo. This is the right answer; calling it out so the team aligns on it.

## Status

Implemented. Verified:

- All workspace typechecks clean (SDK, backend, execution-worker, demo, ai-studio).
- All 133 tests pass (116 SDK + 17 execution-core).
- Demo build clean (7.4 MB main chunk; `fix-worker` ran successfully for `avoid-nodes-edges`).
- AI Studio build clean (1.05 MB main chunk; no obfuscation, no `fix-worker` step needed).
- `knip` clean — no unused exports, files, or dependencies after package.json cleanup (`ajv`, `remeda`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `i18next`, `i18next-browser-languagedetector`, `react-i18next` dropped from ai-studio; `@workflow-builder/types` dropped from demo, since AI Studio is the only consumer of that workspace package after the move).
- Browser smoke test passed manually — Play/Stop, log panel, node detail, highlighting, and node markers all behave correctly in `pnpm dev:ai-studio`.

### Follow-ups

CI pipeline wiring, the AI Studio Dockerfile, and the `apps/docs` Showcases entry land in a follow-up PR.

Accepted.
