# @workflow-builder/execution-worker

> **Note:** setup is in [root README "Path C. Run the full stack demo"](../../README.md#path-c-run-the-full-stack-demo). This file documents the worker's internals.

Background process that executes workflow graphs submitted by the backend. Currently backed by Temporal; structured so other engines (in-memory, BullMQ, …) can slot in without touching domain logic.

## Role

```
backend  ──▶  Temporal (queue)  ──▶  execution-worker  ──┬──▶  execute node (AI agent, decision, …)
                                                          ├──▶  emit execution events → Postgres
                                                          └──▶  update execution status → Postgres
```

The worker polls a task queue, runs activities, and persists side-effects. All workflow logic lives in [@workflow-builder/execution-core](../../packages/execution-core/README.md); the worker is the adapter that wires that logic to Temporal primitives.

## Running alone

For debugging only. `pnpm dev:ai-studio` from the root starts the worker alongside backend and frontend.

```bash
pnpm dev:worker          # alias for pnpm --filter execution-worker dev
```

Requires Postgres + Temporal running. Start them with `pnpm infra:up`.

## Environment

See `.env.example`. Required:

| Var                  | Purpose                            | Default                                              |
| -------------------- | ---------------------------------- | ---------------------------------------------------- |
| `OPENROUTER_API_KEY` | AI agent activities (**required**) | —                                                    |
| `DATABASE_URL`       | Execution events + status          | `postgresql://wb:wb@127.0.0.1:5432/workflow_builder` |
| `TEMPORAL_ADDRESS`   | Temporal server address            | `127.0.0.1:7233`                                     |
| `AI_MODEL`           | OpenRouter model ID                | `anthropic/claude-3.5-haiku`                         |

## Structure

```
src/
├── database.ts            # Raw SQL for exec events + status updates (no Drizzle — avoids backend schema coupling)
├── env.ts                 # Centralized env validation — fail fast at module load
└── engines/
    └── temporal/
        ├── worker.ts                      # Temporal Worker bootstrap + NodeExecutorRegistry
        ├── activities-interface.ts        # Activity signatures proxied from the workflow sandbox
        └── workflows/
            └── run-workflow.ts            # Temporal workflow — delegates to runGraph from execution-core
```

## Temporal specifics

- **Task queue:** `workflow-execution` (must match `TemporalEngine` in the backend).
- **Workflow ID:** `execution-<executionId>` — deterministic, lets the backend cancel by execution ID.
- **Activity timeouts:** DB activities get 30s / 5 retries; node activities (may call LLMs) get 10m / 2 retries. See [run-workflow.ts](src/engines/temporal/workflows/run-workflow.ts).
- **Sandbox constraint:** `workflows/*.ts` runs in V8 with no Web APIs — import from `@workflow-builder/execution-core/workflow` (sandbox-safe subset), never from the root barrel.

## Adding a new engine

1. Create `src/engines/<name>/` with:
   - a bootstrap (equivalent of `worker.ts`) that wires up `NodeExecutorRegistry` and connects to the queue
   - an adapter in `apps/backend/src/engine/<name>-engine.ts` implementing `WorkflowEnginePort`
2. Point `getWorkflowEngine()` in `apps/backend/src/engine/index.ts` at the new adapter (or add config-driven selection).
3. Reuse `runGraph` from `@workflow-builder/execution-core/workflow` — the graph traversal is engine-agnostic.

The domain layer (`execution-core`) never has to change.
