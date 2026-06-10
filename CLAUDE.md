# Workflow Builder

Visual workflow editor SDK (React) with a reference backend and Temporal-based execution. Monorepo with pnpm workspaces.

## Quick Reference

Three onboarding paths (A installs from npm; B, C run the repo locally). README "Get started" covers all three. Path A ("Embed the SDK") installs `@workflowbuilder/sdk` from npm; the README has install + a minimal snippet, and the full guide lives in the [docs site](https://www.workflowbuilder.io/docs/get-started/quick-start/wb-as-react-component/).

| Command                      | Path | What it does                                                                |
| ---------------------------- | ---- | --------------------------------------------------------------------------- |
| `pnpm preflight`             | B/C  | Verify Node / pnpm / Docker / ports / `.env` files. Add `--json` for agents |
| `pnpm dev` / `pnpm dev:demo` | B    | Demo (UI only, port 4200). No backend, no Docker                            |
| `pnpm infra:up`              | C    | Start Postgres + Temporal in Docker. Required before backend/worker         |
| `pnpm -F backend db:migrate` | C    | Apply Drizzle migrations. First run, or after schema changes                |
| `pnpm dev:ai-studio`         | C    | Full stack: infra + backend (3001) + worker + AI Studio frontend (4201)     |
| `pnpm dev:backend`           | C    | Backend only (debug). Needs infra up                                        |
| `pnpm dev:worker`            | C    | Execution worker only (debug). Needs infra up                               |
| `pnpm infra:down`            | C    | Stop the Docker stack                                                       |
| `pnpm dev:docs`              | -    | Docs site (Astro + Starlight)                                               |
| `pnpm build:lib`             | -    | Build the SDK package (`packages/sdk`)                                      |
| `pnpm build`                 | -    | Build the demo app                                                          |
| `pnpm test`                  | -    | Run tests in `packages/sdk` and `packages/execution-core`                   |
| `pnpm check`                 | -    | Lint + typecheck + format + knip                                            |

Path B is UI-only and does not need Docker. Path C requires `pnpm infra:up` before backend/worker can start, and `db:migrate` on the first run.

### Agent signals

Long-running processes already emit stable log lines that scripts and agents can grep for:

| Process              | Ready signal                                                                     |
| -------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev:demo`      | `VITE vX.Y.Z  ready in NNN ms` and `Local:   http://localhost:4200/`             |
| `pnpm dev:backend`   | `Backend running on http://127.0.0.1:3001`                                       |
| `pnpm dev:worker`    | `Execution worker started on task queue: workflow-execution`                     |
| `pnpm dev:ai-studio` | All three above interleaved with `[backend]`, `[worker]`, `[ai-studio]` prefixes |
| `pnpm infra:wait`    | `Temporal ready`                                                                 |

`pnpm preflight --json` returns `{ ok: boolean, checks: [{ name: string, status: 'pass' | 'warn' | 'fail', detail: string }] }` for programmatic inspection. Top-level `ok` is `true` when no check has `status: 'fail'`.

## Monorepo Structure

```
tools/              - Root dev scripts: preflight, setup:env, infra wait
  deployment/       - Swarm/Ansible deploy path mirroring the workflow-builder repo (ACR, Traefik)
deploy/
  ai-studio/        - Production deployment: Dockerfile (runtime/migrate/web), compose, nginx, README
apps/
  demo/             - Reference app consuming the SDK (React + Vite, port 4200)
  ai-studio/        - Reference AI workflow product (React + Vite, port 4201)
  backend/          - Hono REST + SSE server, Drizzle/Postgres, Temporal client (port 3001)
  execution-worker/ - Temporal worker hosting execution-core (task queue: workflow-execution)
  docs/             - Astro + Starlight documentation site
  icons/            - Icon generation pipeline
  tools/            - @workflow-builder/tools workspace (decision-log collector, lint-staged config)
packages/
  sdk/              - @workflowbuilder/sdk public package (WorkflowBuilder compound component, plugin API, components)
  execution-core/   - Pure topological graph runner + node executor registry
  types/            - Shared TypeScript types
```

Where to put a new script: root `tools/` for pure-Node bootstrap (runs before any workspace is built); `apps/tools/` for tooling that needs TypeScript or workspace deps.

## Per-workspace docs

Each workspace has its own context. Read the relevant file before extending a workspace.

| Workspace                 | Authoritative docs                  |
| ------------------------- | ----------------------------------- |
| `packages/sdk`            | `packages/sdk/README.md`            |
| `packages/execution-core` | `packages/execution-core/README.md` |
| `apps/demo`               | `apps/demo/CLAUDE.md`               |
| `apps/ai-studio`          | `apps/ai-studio/README.md`          |
| `apps/backend`            | `apps/backend/README.md`            |
| `apps/execution-worker`   | `apps/execution-worker/README.md`   |

## Types & Aliases

Shared types: `packages/types/` (imported as `@workflow-builder/types/*`).
Icons: `apps/icons/` (imported as `@workflow-builder/icons`).
SDK: `packages/sdk/` (imported as `@workflowbuilder/sdk`).

## Local Infrastructure

`pnpm infra:up` starts:

- Postgres on `5432` (DB `workflow_builder`, user `wb`, pass `wb`) — app data
- Postgres on `5433` (DB `temporal`) — Temporal's own state store
- Temporal server on `7233` (gRPC)
- Temporal UI on http://localhost:8233

Backend reads `DATABASE_URL` and `TEMPORAL_ADDRESS`; defaults work out of the box. `pnpm infra:down` stops everything.

## Code Quality

| Tool       | Command                       | Notes                                                     |
| ---------- | ----------------------------- | --------------------------------------------------------- |
| ESLint     | `pnpm lint` / `pnpm lint:fix` | Per-workspace configs                                     |
| Prettier   | `pnpm format`                 | Sorts imports via `@trivago/prettier-plugin-sort-imports` |
| TypeScript | `pnpm typecheck`              | Per-workspace `tsconfig.json`                             |
| Knip       | Part of `pnpm check`          | Detects unused exports/dependencies                       |
| Vitest     | `pnpm test`                   | Runs in `packages/sdk` and `packages/execution-core`      |
| Full check | `pnpm check`                  | Run before PR                                             |

## Getting Started

If you're new to this repo and want to build your own consumer app or POC, follow this order:

1. **Bring up the stack once** to confirm everything works: run `pnpm preflight` first to verify Node / pnpm / Docker / ports / `.env` files, then `/wb.run-locally` (full stack with backend execution) or `pnpm dev:demo` (UI only, no LLM key needed). Open http://localhost:4200 to confirm the demo loads.
2. **Scaffold your own app**: `/wb.create-app <your-app-name>`. The skill is interactive — it asks for port, plugins, nodes, and templates to copy from demo. Pick a bare scaffold or seed it with whatever you want from demo's plugins/nodes/templates.
3. **Iterate inside your app** using the target-aware skills. They all ask which `apps/<X>/` to write into and default to your app once it exists:
   - `/wb.create-node <name>` — add a new UI node type
   - `/wb.create-plugin <name>` — add a new plugin (toolbar buttons, hooks, panels)
   - `/wb.create-template <name>` — add a starter diagram
4. **For executable nodes** (backend / Temporal): `/wb.add-execution-handler <type>`. The execution pipeline is shared across all consumer apps — you only register once. Make sure your app has either `ai-studio` (backend path) or `flow-runner` (in-browser path) plugin so the UI can actually invoke the executor.
5. **Run your app**: `pnpm dev:<your-app-name>` for UI-only, or see `/wb.run-locally` for the full-stack 3-terminal layout.

`apps/demo/` is the canonical reference for node anatomy, plugin patterns, and templates — open it to learn from, but **do not edit it**; build in your own `apps/<your-app-name>/` instead.

## Common Slash Commands

| Command                            | What it does                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/wb.create-app <name>`            | Scaffold a new SDK-consuming frontend app under `apps/<name>/` — interactive (port, plugins/nodes/templates to seed from demo)        |
| `/wb.create-node <name>`           | Scaffold a new UI node type — asks for target app (default `demo`)                                                                    |
| `/wb.create-plugin <name>`         | Scaffold a new SDK plugin — asks for target app (default `demo`)                                                                      |
| `/wb.create-template <name>`       | Scaffold a new diagram template — asks for target app (default `demo`)                                                                |
| `/wb.add-execution-handler <type>` | Wire a node type into execution-core + worker registry (global pipeline, no target)                                                   |
| `/wb.run-locally`                  | Bring up the stack — Path B (`pnpm dev:demo`) or Path C (infra + backend + worker + AI Studio frontend)                               |
| `/wb.task`                         | Fetch assigned ClickUp tasks via MCP and recommend one to pick up                                                                     |
| `/wb.task WB-42`                   | Pick up a specific task with an inline plan                                                                                           |
| `/wb.changeset <bump> "<summary>"` | Add a changeset for SDK changes (`patch` / `minor` / `major`) — required before merging consumer-visible changes to `packages/sdk/**` |

### Releasing `@workflowbuilder/sdk`

The SDK is the only npm-published workspace; everything else under `apps/` and `packages/` is private (and listed under `ignore` in `.changeset/config.json`).

**Commit format is enforced.** Every commit goes through `commitlint` via the `commit-msg` husky hook — Conventional Commits format only (`<type>(<scope>): <subject>`, types from `feat / fix / perf / refactor / docs / test / chore / build / ci / style / revert`). Bad messages are rejected before they land in git history.

**Daily SDK change:**

1. Edit `packages/sdk/**`, run tests/typecheck locally.
2. **Add a changeset** with `/wb.changeset <patch|minor|major> "<summary>"`. Required for any consumer-visible change. Skip only for changes that don't ship in `dist/` (e.g. `eslint.config.mjs`, internal tests, source-only comments).
3. Commit code + changeset together with a Conventional Commits message:
   ```
   git add packages/sdk/... .changeset/<slug>.md
   git commit -m "fix(sdk): zustand store identity leak"
   ```
4. Open PR to `main`. The changeset file is part of the PR diff — reviewer sees the declared bump alongside the change.

**`<WorkflowBuilder.Root>` props live on three surfaces.** The type in `packages/sdk/src/workflow-builder-root/workflow-builder-root.types.ts` is the source of truth; the `/api/core/workflowbuilderrootprops/` reference is generated from its JSDoc and never drifts. Two hand-written tables mirror it: `packages/sdk/README.md` (npm landing) and `apps/docs/src/content/docs/guides/configuring-the-editor.md` (docs guide). When you add, rename, or remove a prop, update both tables in the same change. Descriptions may differ per surface (the README leans on gotchas, the guide on how / when); the set of prop names must match.

**Release moment** (maintainer, not Claude):

1. Open PR `release/vX.Y.Z` → `release`. In the branch, run `pnpm changeset version` — bumps `packages/sdk/package.json`, regenerates `packages/sdk/CHANGELOG.md` (then reformat it into Keep a Changelog style before committing, see [`packages/sdk/RELEASE.md`](packages/sdk/RELEASE.md) § "Reformat the generated CHANGELOG section"), deletes consumed `.changeset/*.md`.
2. Review the diff, merge the PR into `release`.
3. Tag the merge commit on `release`: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. GitHub Action triggered by the tag runs lint + typecheck + test + `pnpm publish --provenance` (authenticated via npm Trusted Publisher / OIDC, no `NPM_TOKEN` stored anywhere) + creates a GitHub Release.
5. Sync back: `git checkout main && git merge release && git push` so main picks up the bumped version + clean `.changeset/`.

Tag format follows the ng-diagram convention (single-package monorepo, `v*` regex). If we ever publish a second package we'll migrate to scoped (`@workflowbuilder/sdk@X.Y.Z`) — ~1h of work, see `packages/sdk/RELEASE.md` § "Why these decisions".

Canonical procedure with edge cases and rollback: [`packages/sdk/RELEASE.md`](packages/sdk/RELEASE.md).

### Maintaining `/wb.*` skills

The skills under `.claude/commands/wb.*.md` mix three kinds of content:

1. **Structural rules** (e.g. "node folder needs 4 files", "Required template fields") — domain knowledge, stable across SDK versions.
2. **Pointers to canonical reference** (e.g. "see `apps/demo/src/app/data/nodes/action/`") — auto-up-to-date because the file itself is the source of truth.
3. **Inline TypeScript snippets** (plugin skeletons, app.tsx scaffolds, executor templates) — **snapshots** that drift as the SDK evolves.

When executing a skill, if a snippet contradicts the canonical reference (or the live SDK source), **canonical wins**. Snippets are starting points; live code is truth.

**Self-heal**: if you spot drift while executing a skill, refresh the affected snippet in the skill file as part of your change. Bundle it with the user's task in the same commit (or a follow-up commit titled `docs: refresh /wb.<name> snippet for <change>`). Frequent small refreshes are healthy — stale snippets accumulate friction.

### ClickUp MCP

ClickUp MCP is configured for this project in `.mcp.json` using the official remote server at `https://mcp.clickup.com/mcp`.

First-time setup in Claude Code:

1. Open a Claude Code session in this repo.
2. Run `/mcp`.
3. Authenticate the `clickup` server via the OAuth flow.

The project provides a `/wb.task` wrapper command that uses ClickUp MCP to fetch assigned tasks or a specific task by ticket.
