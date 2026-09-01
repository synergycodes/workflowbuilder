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

See `.env.example`. Every variable has a working default:

| Var                | Purpose                               | Default                                              |
| ------------------ | ------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`     | Execution events + status             | `postgresql://wb:wb@127.0.0.1:5432/workflow_builder` |
| `TEMPORAL_ADDRESS` | Temporal server address               | `127.0.0.1:7233`                                     |
| `AI_API_KEY`       | LLM for AI Agent nodes (optional)     | — (AI Agent nodes fail)                              |
| `AI_BASE_URL`      | Any OpenAI-compatible endpoint        | `https://openrouter.ai/api/v1`                       |
| `AI_MODEL`         | Model id, as the endpoint spells it   | `mistralai/mistral-small-3.2-24b-instruct`           |
| `TAVILY_API_KEY`   | AI Agent's web-search tool (optional) | — (tool disabled)                                    |

`AI_API_KEY` is optional by design: the worker boots without it and runs every non-AI node, and
an AI Agent node that is reached fails with the `ai_not_configured` code rather than taking the
whole worker down. `OPENROUTER_API_KEY` is the former name of this variable and is still read
when `AI_API_KEY` is empty.

Point `AI_BASE_URL` at any OpenAI-compatible server — a gateway, or a model hosted inside your
own network — and no request leaves that network.

## Structure

```
src/
├── database.ts            # Raw SQL for exec events + status updates (no Drizzle — avoids backend schema coupling)
├── env.ts                 # Centralized env reading, with the defaults documented above
└── engines/
    └── temporal/
        ├── worker.ts                      # Worker bootstrap: executors + store, handed to WorkflowBuilderPlugin
        └── workflows.ts                   # One-line re-export of runWorkflow for Temporal's bundler
```

The workflow itself, the activity contract and the event emitter live in
[`@workflowbuilder/temporal`](../../packages/temporal/README.md). This app only supplies what is its
own: one executor per node type and the database as the store port.

## Temporal specifics

- **Task queue:** `workflow-execution`, read from `plugin.taskQueue` so the backend and the worker cannot drift apart. Both default to the same constant in the package.
- **Workflow ID:** `execution-<executionId>` — deterministic, lets the backend cancel by execution ID. Also owned by the package.
- **Activity timeouts:** DB activities get 30s / 5 retries; node activities (may call LLMs) get 10m / 2 retries. Exported as `DEFAULT_DATABASE_ACTIVITY_PROFILE` and `DEFAULT_NODE_ACTIVITY_PROFILE`.
- **Retries per failure:** an executor throwing `PermanentNodeExecutionError` stops on its first attempt; `TransientNodeExecutionError` retries within the profile's limit. An unclassified throw keeps today's behavior — the reference executors have not been classified yet.
- **Sandbox constraint:** `workflows.ts` is bundled into V8 with no Web APIs. It may only re-export from `@workflowbuilder/temporal/workflow`, never from the package root.
- **Editing the package:** the worker imports its built `dist`, so run `pnpm build:temporal` after changing `packages/temporal/src`.
- **Deploys that change the emitted event set:** drain in-flight runs first. Replaying an old run's history against a new emit sequence diverges — see [`replay-audit.md`](../../packages/execution-core/replay-audit.md) rule 9.

## Adding a new engine

1. Create `src/engines/<name>/` with:
   - a bootstrap (equivalent of `worker.ts`) that wires up `NodeExecutorRegistry` and connects to the queue
   - an adapter in `apps/backend/src/engine/<name>-engine.ts` implementing `WorkflowEnginePort`
2. Point `getWorkflowEngine()` in `apps/backend/src/engine/index.ts` at the new adapter (or add config-driven selection).
3. Reuse `runGraph` from `@workflow-builder/execution-core/workflow` — the graph traversal is engine-agnostic.

The domain layer (`execution-core`) never has to change.
