# AI Studio — Execution Backend

> ⚠️ **Reference implementation, local development only.**
> No real authentication. The bundled `AllowAllAuthPort` permits every caller and every action (see `src/auth/`), and the constructor refuses to start without the explicit `WB_AUTH_PORT=allow-all` opt-in so a forgotten env var fails loudly. No tenant isolation. The HTTP server and the docker-compose services bind to `127.0.0.1` by default. Do not expose to the internet or shared networks without first plugging in a real `AuthPort`, see [`auth-port.decision-log.md`](./auth-port.decision-log.md) for the seam, default, and a JWT adapter sketch.
>
> Seams for consumers to plug in: [`AuthPort`](./auth-port.decision-log.md) for authn/authz, [`TenantContextPort`](./tenant-context-port.decision-log.md) for multi-tenant identity propagation (wiring guide: [`multi-tenancy.md`](./multi-tenancy.md)).

> **Note:** setup is in [root README "Path B. Run the full stack demo"](../../README.md#path-b-run-the-full-stack-demo). This file documents the backend's internals, not how to start it.

Backend execution layer for Workflow Builder AI Studio plugin. Runs AI workflows defined on the canvas via Temporal + OpenRouter.

## Architecture

Hexagonal — the backend depends on **ports**, not on Temporal. The Temporal-backed adapter is swappable.

```
Frontend (React)
     │                                                  ┌── execute node (AI agent, decision, …)
     ▼                                                  │
 Backend (Hono) ──▶ WorkflowEnginePort ──▶ Temporal ──▶ Worker ──┼── emit event → Postgres
     ▲                 │                                  │      │
     │                 └─ impl: TemporalEngine            │      └── update status → Postgres
     └── SSE stream (Postgres LISTEN/NOTIFY) ◀────────────┘
```

- **Backend** (`apps/backend`) — Hono HTTP server, workflow CRUD, SSE streaming via Postgres LISTEN/NOTIFY. Submits executions through `WorkflowEnginePort`.
- **Engine adapter** (`apps/backend/src/engine/temporal-engine.ts`) — implements `WorkflowEnginePort` against Temporal. Swap this file to switch engines.
- **Worker** (`apps/execution-worker`) — Temporal worker. Activities delegate node execution to `execution-core`. See the [worker README](../execution-worker/README.md).
- **Domain** (`packages/execution-core`) — pure graph runner + ports + node executors. No Temporal, no HTTP. See the [execution-core README](../../packages/execution-core/README.md).
- **Frontend** (`apps/ai-studio`) — full AI workflow product. Composes `@workflowbuilder/sdk` directly via JSX, with a slim plugin only for per-node execution markers. Owns Play/Stop controls, log panel, node detail, and execution highlighting.

## Running individual processes

For debugging, the parts that `pnpm dev:ai-studio` orchestrates can also be run separately:

```bash
pnpm infra:up                                              # Postgres + Temporal
pnpm dev:backend                                           # Hono on port 3001
pnpm dev:worker                                            # Temporal worker
pnpm --filter @workflow-builder/ai-studio dev              # Frontend on port 4201
```

| Service            | URL                   |
| ------------------ | --------------------- |
| AI Studio frontend | http://localhost:4201 |
| Demo frontend      | http://localhost:4200 |
| Backend API        | http://localhost:3001 |
| Temporal UI        | http://localhost:8233 |

## Environment

`apps/backend/.env` and `apps/execution-worker/.env` both consume:

```env
DATABASE_URL=postgresql://wb:wb@127.0.0.1:5432/workflow_builder
TEMPORAL_ADDRESS=127.0.0.1:7233
```

Worker additionally needs `OPENROUTER_API_KEY` and optionally `AI_MODEL`. See [`apps/execution-worker/README.md`](../execution-worker/README.md).

## Scripts

All scripts run from the monorepo root. Grouped by purpose:

### Bootstrap

| Script      | What it does                                                              |
| ----------- | ------------------------------------------------------------------------- |
| `preflight` | Verify Node / pnpm / Docker / ports / `.env` files. `--json` for tooling. |
| `setup:env` | Copy `.env.example` → `.env` for backend and worker (won't overwrite).    |

### Dev (running apps)

| Script          | What it does                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `dev`           | Default — runs `dev:demo` (lightweight, no backend)                                                      |
| `dev:demo`      | Demo frontend only (Vite + typecheck watch); no backend dependency                                       |
| `dev:ai-studio` | Orchestrator — starts infra, waits for Temporal, then backend + worker + AI Studio frontend concurrently |
| `dev:backend`   | Backend only (Hono server with `tsx watch`)                                                              |
| `dev:worker`    | Execution worker only (Temporal worker with `tsx watch`)                                                 |
| `dev:docs`      | Docs site (Astro)                                                                                        |
| `dev:local`     | Demo frontend with `LOCAL_OVERFLOW_UI=true` (linked local overflow-ui)                                   |

### Infra (Docker lifecycle)

| Script       | What it does                                                             |
| ------------ | ------------------------------------------------------------------------ |
| `infra:up`   | Starts Postgres + Temporal + Temporal UI via docker compose              |
| `infra:down` | Stops and removes the containers                                         |
| `infra:wait` | Polls Temporal UI until it responds (used internally by `dev:ai-studio`) |

### Database (Drizzle)

| Script        | What it does                                 |
| ------------- | -------------------------------------------- |
| `db:generate` | Generate a new migration from schema changes |
| `db:migrate`  | Apply pending migrations to the database     |

### Builds

| Script            | What it does                                       |
| ----------------- | -------------------------------------------------- |
| `build`           | Build the demo frontend                            |
| `build:ai-studio` | Build the AI Studio frontend                       |
| `build:lib`       | Build the SDK as a library                         |
| `build:docs`      | Build the docs site                                |
| `preview-build`   | Build + run a preview server for the demo frontend |

### Quality

| Script      | What it does                                         |
| ----------- | ---------------------------------------------------- |
| `lint`      | ESLint across all workspaces                         |
| `lint:fix`  | ESLint with `--fix`                                  |
| `format`    | Prettier write across the repo                       |
| `typecheck` | `tsc --noEmit` across workspaces                     |
| `test`      | Frontend tests (Vitest)                              |
| `check`     | Lint + typecheck + format + knip (full quality gate) |

### Git hooks (invoked by Husky, not meant to run manually)

| Script       | What it does                                      |
| ------------ | ------------------------------------------------- |
| `pre-commit` | Runs `lint-staged` on staged files                |
| `pre-push`   | Runs format + knip before allowing push           |
| `prepare`    | Installs husky hooks (auto-run on `pnpm install`) |
