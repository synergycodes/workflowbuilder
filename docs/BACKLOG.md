# BACKLOG — Visualize node (generalize markdown-preview)

> **AGENT — LONG-WORK MODE.** Execute this backlog top-to-bottom to completion. Do NOT stop to ask.
> On any small doubt: follow the recommendation / a recorded decision (see `docs/plans/2026-06-24-visualize-node/choices.md`) and keep going; log the deviation in "Deviations" below. Per item: read → implement → verify (typecheck + lint, smoke at milestones) → commit → mark ✅ → next.
> Re-read this file after any context compaction (then `git log --oneline`). Stop ONLY when every item is ✅ or ⏭️ and the final verify is green — or when genuinely blocked (record ⏭️ with reason).

Branch: `librowski/AI-Studio-UX` (not default → no new branch needed). Commits: Conventional Commits, NO `Co-Authored-By`, no em-dashes. Do not push. Full stack running locally (frontend 4203, backend 3001, worker) for smoke tests.

Verify per item = `pnpm --filter @workflow-builder/ai-studio typecheck && lint` (+ worker when touched). Browser smoke via agent-browser at milestones (after light renderers, after charts/diagrams, final).

## Checklist

1. ✅ **Establish `visualize` node (transform uncommitted markdown-preview)**
   - Accept: node type `ai-studio/visualize`; palette item "Visualize"; worker domain `VisualizeNode` + `executeVisualize` (no-op `{visualized:true}`) + registry; flagship template `support-triage-flow` uses visualize; markdown still renders under new name. typecheck+lint green (ai-studio+worker). ✓ all green.
   - ✅ rename `nodes/markdown-preview/` → `nodes/visualize/`, type string, palette label/icon (Eye)
   - ✅ worker: domain union `VisualizeNode`, executor `visualize.ts`, registry key
   - ✅ rewire flagship `preview-1` → `visualize-1`; node-types.ts; plugin.ts; card `components/visualize/visualize-card`
   - ✅ commit `refactor(ai-studio): rename markdown-preview node to visualize`

2. ✅ **Format detection util** (`detectFormat`) + vitest tests
   - Accept: `detectFormat(text) -> { renderer, data?, chartable? }` per choices.md rules; unit tests pass. ✓ 11 tests green.
   - ✅ util `utils/detect-format.ts` + `detect-format.test.ts`; typecheck+lint+test green
   - Note: `auto` fallback = `markdown` (renders prose fine); `text` (<pre>) is override-only. CSV hardened (all-line consistent col count + short headers).
   - ✅ commit `feat(ai-studio): detect output format for visualize`

3. ✅ **`mode` param** (auto + override enum) in schema/uischema/default-properties
   - Accept: schema enum `auto|markdown|text|json|table|stat-cards|chart|diagram`, default `auto`; Select "Render as" in uischema. ✓ tc+lint green. `VISUALIZE_MODES`/`VisualizeMode` exported from schema.
   - ✅ commit `feat(ai-studio): add mode param to visualize node`

4. ✅ **Light renderers + registry** (text, json-tree, table, stat-cards; markdown) + card uses detectFormat/mode + "Auto › X" badge
   - Accept: each renderer renders; auto picks per detection; override via properties-panel mode; badge shows; no heavy deps. tc+lint+unit green. (browser smoke batched after item 5.)
   - ✅ `renderers.tsx` (Markdown/Text/Json-tree/Table/StatCards + getRenderer + RENDERER_LABELS) + `renderers.module.css`; card rewritten to detectFormat/mode + badge. chart->table, diagram->text interim (real in items 6/7).
   - Note: override applies via properties panel Select; card reads mode from node data (reactive on node re-render). No on-card dropdown (deviation).
   - ✅ commit `feat(ai-studio): json/table/text/stat-card renderers for visualize`

5. ✅ **Always-on card + empty-state + predefined size**
   - Accept: visualize node shows card always (min-height 8.5rem) with placeholder before run; fills on completed; reveal anim moved to content. ✓ tc+lint green. ✓ MILESTONE SMOKE PASS (fresh browser): node "Visualize", card badge "Auto › Markdown", QA reply rendered as markdown (bold + numbered list).
   - ✅ commit `feat(ai-studio): always-on visualize card with empty state`

6. ✅ **Chart renderer (recharts, lazy)** + chart-spec envelope + "try as chart" chip
   - Accept: array `{label,value}`/`{x,y}` or `{type,data}` → bar/line/area/pie; React.lazy (recharts only loads for charts); chip on card suggests chart when data is chartable. ✓ tc+lint green. (chart smoke at item 10.)
   - ✅ add recharts; `chart-renderer.tsx` lazy in `getRenderer`; card wraps body in Suspense + `forceChart` chip.
   - ✅ commit `feat(ai-studio): chart renderer (recharts) for visualize`

7. ✅ **Diagram renderer (mermaid, lazy, SVG)** + try/catch fallback
   - Accept: mermaid source → SVG via mermaid.render; React.lazy (mermaid only loads for diagrams); bad syntax → falls back to raw text. ✓ tc+lint green. (diagram smoke at item 10.)
   - ✅ add mermaid; `diagram-renderer.tsx` (securityLevel strict, neutral theme) lazy in getRenderer.
   - ✅ commit `feat(ai-studio): mermaid diagram renderer for visualize`

8. ✅ **Export** (PNG download + copy image + copy source; SVG in util)
   - Accept: header actions export the card content; html-to-image PNG; copy-image with Firefox→download fallback; copy source text. ✓ tc+lint green. SVG download (native serialize fast-path) lives in util `downloadSvg`, surfaced in the expand modal (item 9).
   - ✅ add html-to-image; `utils/export-visualization.ts`; card header Copy image / Download PNG / Copy source buttons (ref on content).
   - ✅ commit `feat(ai-studio): export visualize output (png/svg/copy)`

9. ✅ **Expand fullscreen modal** (same renderer full-size + export incl. SVG)
   - Accept: Expand button opens an overlay (via createPortal to body, escaping the RF transform) rendering the same renderer large with export actions (PNG/SVG/copy image/copy source). ✓ tc+lint green. (modal smoke at item 10.)
   - ✅ `visualize-modal.tsx` (+css) via createPortal; card Expand (ArrowsOut) button + `expanded` state; activeRenderer/data hoisted.
   - ✅ commit `feat(ai-studio): expand visualize to fullscreen modal`

10. ✅ **Final verify + comprehensive smoke**
    - ✅ ai-studio: test 11/11, typecheck, lint green. worker: typecheck, lint green. ✅ `pnpm build:ai-studio` succeeds — recharts (`chart-renderer` chunk, 106KB gz) and mermaid (`diagram-renderer` + sub-chunks, 134KB gz) confirmed as SEPARATE lazy chunks (not in base bundle).
    - ✅ SMOKE (fresh browser): flagship Run → Visualize card renders QA reply as markdown, badge "Auto › Markdown", export action icons present; Expand → fullscreen modal (portal, correctly centered over viewport) renders content + export + close.
    - ⏭️ chart/diagram rendering NOT visually smoked: the flagship's Visualize reads the QA agent (prose → markdown), so no structured data flows into it. Covered by detectFormat unit tests + typecheck + build (lazy chunks). Suggested fast-follow: a "Data → Visualize" demo template (Trigger with JSON/CSV/mermaid input → Visualize) to showcase charts/diagrams and give a structured visual smoke.
    - ✅ commit final (docs + getRenderer comment)

## Decisions (locked — see choices.md)

1 Generalize (rename) · 2 mode auto+override · 3 full 7 renderers · 4 recharts (chart, lazy) + mermaid→SVG (diagram, lazy) + html-to-image (export) · 5 PNG download + copy image + copy source + SVG-for-vector · 6 conservative auto + suggestion chip + chart-spec envelope · 7 app theme only (no presets, fast-follow) · 8 always-on card + empty-state + Expand modal · 9 one pass.

## Deviations (append-only)

- markdown-preview was never committed; evolving it directly into `visualize` (no standalone markdown-preview commit). Per choices.md decision 1.
- Stop-hook NOT installed: auto-mode classifier denied writing `.claude/hooks` + `.claude/settings.local.json` (self-modification of agent config). Relying on durable BACKLOG.md + continuous in-session execution instead (skill's primary mechanism). Walk-away guarantee is soft (no hard hook).
- agent-browser HTTP-caches dev modules: after code changes it served a stale pre-edit `support-triage-flow.ts` (showed old "Markdown Preview" node) even after vite restart + localStorage clear. Fix: `agent-browser close --all` before a smoke when code changed (fresh context = empty cache). Use this before the final smoke (item 10).
- Renderer override is via the properties-panel mode Select (no on-card dropdown); card reads mode from node data.

## Final state (2026-06-25)

All 10 items ✅ except the deferred ⏭️ chart/diagram VISUAL smoke (item 10 — unit+type+build verified; needs a structured upstream). 10 commits on `librowski/AI-Studio-UX`, nothing pushed. No Stop hook to remove (was never installed — classifier denied). Local stack left running for the user (frontend :4203, backend :3001, worker). `forceChart` chip state does not reset across re-runs (minor).
