### Title: Workspace layout — relocate libraries to `packages/`

### Proposed by: Kuba Skibiński

### Date: 05.05.2026

## Context

§2 of `packages/sdk/sdk-restructuring.decision-log.md` set the workspace rule: `apps/` for runnable apps, `packages/` for libraries. Two workspaces were violating that rule:

- `apps/execution-core/` is a library. Its `package.json` declares only `exports`, no `dev` or `start` script, and is consumed by `apps/backend` and `apps/execution-worker` via `workspace:*`.
- `apps/types/` is a library. Its `package.json` declares `exports: "./*"` and nothing else; consumed by the backend, the worker, and the SDK.

Both belonged under `packages/`. Leaving them in `apps/` meant a new contributor could not tell libraries from runnable apps by directory alone — undermining the rule §2 had just set. With `apps/ai-studio` recently added by the AI Studio extraction PR, the contrast was sharpening: that directory is unambiguously runnable, while these two siblings sitting next to it are not.

## Decision

Two directory-level moves, no package-name renames, no API changes:

1. **`apps/execution-core/` → `packages/execution-core/`.** Already package-shaped (`exports`, no `dev` script).
2. **`apps/types/` → `packages/types/`.** Already package-shaped (`exports: "./*"`, no scripts beyond typecheck/lint).

`apps/backend/` and `apps/execution-worker/` keep their names. Both are runnable, both belong in `apps/`, neither needed a rename to communicate that.

Cascade updates kept in scope:

- `pnpm-workspace.yaml` globs (`./apps/*`, `./packages/*`) already cover both target locations — no change.
- `pnpm-lock.yaml` regenerated; importer keys auto-updated to the new directory paths.
- Root `package.json`: no script changes required — every filter expression resolves by package name (which is preserved), not by directory path.
- `knip.config.js` workspace keys repointed.
- `tools/check-env.mjs` env file paths needed no change (only `apps/backend` and `apps/execution-worker` paths, neither moved).
- README references in the root, the moved READMEs, the root `CLAUDE.md`, and the four decision logs that referenced the moved paths (`local-dev-binding`, `cancellation-handling`, `topological-scheduling`, `decision-no-match`) updated to current paths. The `.claude/commands/wb.{add-execution-handler,create-node,run-locally}.md` skill files that referenced the old paths updated likewise. The comment in `apps/backend/src/domain/mapper/snapshot-schema.ts` pointing at `apps/execution-core/src/executors/decision.ts` repointed at `packages/execution-core/...`.
- Pre-existing stale sentence in `packages/sdk/src/features/json-form/form-generation.md` pointed at `apps/backend/src/diagram/data/mocks/mocked.data.ts`, which had not existed since the SDK restructuring. Removed the sentence rather than maintaining a confidently-worded pointer at nothing.
- `DECISION-LOGS.md` regenerated via `pnpm -F tools collect-decision-logs`.

## Alternative Options Considered

- **Rename the runnable apps too** (`apps/backend` → `apps/reference-backend`, `apps/execution-worker` → `apps/reference-worker` or just `apps/worker`). Rejected. The reference-implementation framing is already carried by three high-volume doc surfaces (backend README header, root README warning, `local-dev-binding` decision log); encoding it in the directory name as well pays no marginal dividend and lengthens every script and path reference. Shortening `execution-worker` to `worker` is similarly cosmetic — `execution-worker` reads cleanly and matches the npm package name, so the churn pays for nothing.
- **Move `apps/icons/` to `packages/icons/` in the same round.** Rejected. `apps/icons` has its own pending decisions in two existing decision logs; bundling its move here would conflate two distinct conversations.
- **Introduce a published `backend-sdk` package now.** Rejected. The frontend SDK has obvious standalone value (an embeddable graph editor). A backend SDK would mostly be the contract (ports + event types), and that contract already lives in `packages/execution-core`. With no second consumer to validate the API shape against, designing in the void violates §4 of the SDK decision log. Revisit when a non-Temporal consumer arrives.
- **Defer the move and only update READMEs.** Rejected. The directory name is what a contributor sees first; docs are not a substitute for a layout that already says the right thing. §10 of the SDK decision log calls out the same lesson: stale paths survive in `*.mdx` and top-level docs because nothing typechecks them, so the structural fix has to land structurally.

## Consequences

- **Pros**
  - **The §2 rule is now visible from the directory tree alone.** `apps/` ≡ runnable, `packages/` ≡ library — no exceptions, no mental subtraction.
  - **Blame preserved.** Renames registered in `git status`; `git log --follow` walks across the moves.
  - **No API surface change.** Every consumer keeps `workspace:*` against the same npm package names; nothing outside the moved directories needed import-path edits beyond doc/comment references to the directory layout itself.
  - **Stale-path debt paid down on the way through.** The four decision logs that referenced the moved paths, the root `CLAUDE.md`, the three `.claude/commands/wb.*.md` skill files, and the dangling `mocked.data.ts` sentence in `form-generation.md` all got fixed in the same diff. Nothing new added to the stale-path pile.
  - **Minimal blast radius.** Only the two libraries moved; the runnable apps are untouched. No script renames, no Docker/CI path updates, no orchestrator changes.

- **Cons**
  - **Branch conflicts with any in-flight refactor touching the same files.** Anything that modifies the moved decision logs, the root `CLAUDE.md`, or the four `.claude/commands/wb.*.md` skill files will conflict on rebase; whichever lands second carries the small mechanical merge. No semantic surprises — the conflicts are pure path substitutions.

## Status

Implemented. Verified:

- `pnpm install` clean — pnpm-lock.yaml importer keys repointed at the new paths automatically.
- `pnpm typecheck` clean across the seven touched workspaces (sdk, demo, ai-studio, backend, execution-worker, execution-core, types). Pre-existing `apps/docs` typecheck errors on `.astro` files are present on master too and unrelated to this PR.
- `pnpm lint` clean across the seven touched workspaces. Same pre-existing `apps/docs` parsing errors on `.astro` files.
- `pnpm test` clean — all 133 tests pass (116 SDK + 17 execution-core).
- `pnpm knip` clean.
- `git status` shows the two moves as renames, blame preservation confirmed.
- Repo-wide grep for `apps/types|apps/execution-core` returns only the historical paragraph in `packages/sdk/sdk-restructuring.decision-log.md` §10 (intentionally left as historical context describing the section 1–3 migration).

### Out of scope (deferred follow-ups)

- **`apps/icons` → `packages/icons` move.** Deferred behind its existing decision logs.
- **Reference-implementation framing in directory names.** Considered and rejected (see Alternative Options Considered).
- **Pre-existing stale `apps/frontend/...` references** in `docs/using-app-as-component.md` and the docs-site `.mdx` files. Survived the §3 rename in the SDK restructuring; out of scope here, belongs to a docs-side cleanup pass.
- **Pre-existing `apps/docs` lint and typecheck errors** on `.astro` files. Unrelated to this PR; visible on master.

Accepted.
