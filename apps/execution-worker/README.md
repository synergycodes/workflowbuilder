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

See `.env.example`.

| Var                  | Purpose                             | Default                                              |
| -------------------- | ----------------------------------- | ---------------------------------------------------- |
| `OPENROUTER_API_KEY` | AI agent activities (**required**)  | —                                                    |
| `DATABASE_URL`       | Execution events + status           | `postgresql://wb:wb@127.0.0.1:5432/workflow_builder` |
| `TEMPORAL_ADDRESS`   | Temporal server address             | `127.0.0.1:7233`                                     |
| `AI_MODEL`           | OpenRouter model ID                 | `mistralai/mistral-small-3.2-24b-instruct`           |
| `TAVILY_API_KEY`     | AI agent web-search tool (optional) | —                                                    |

## Structure

```
src/
├── database.ts            # Raw SQL for exec events + status updates (no Drizzle — avoids backend schema coupling)
├── env.ts                 # Centralized env validation — fail fast at module load
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

## The AI agent's tool loop

The reference AI Agent node runs the AI SDK's tool loop inside one activity. The loop stops after `MAX_TOOL_STEPS` steps (`src/activities/ai-agent.ts`). At the cap `generateText` returns normally, so the node completes with whatever the last step produced, possibly empty text, rather than failing. The cap only applies when tools are on, which needs both the node's `webSearch` config flag and a `TAVILY_API_KEY`. Without them the activity makes one model call and there is no loop.

This is deliberate: `runGraph` walks a DAG, so it cannot express a loop whose length the model decides at run time. What it costs:

- **A retry re-runs the whole loop.** Tool calls included, so a tool with side effects can run more than once for one node. `generateText` runs with `maxRetries: 0`, so one activity attempt is exactly one pass. To rule the re-run out, give `ai-studio/ai-agent` its own profile through `createRunWorkflow({ nodeActivityProfiles })`, setting `retry.maximumAttempts: 1`. Every profile also has to declare `startToCloseTimeout`, so pass both. See the package README.
- **Temporal records nothing until the activity returns.** If the worker dies mid-loop, every finished step is lost, and the whole loop shares the node profile's single `startToCloseTimeout` (see Temporal specifics above).

There is no durable per-step option today. A fixed sequence of model calls can be split into one node per call, each its own activity that Temporal records and resumes on its own. A model-driven loop cannot: a cycle through the start node is rejected before the run starts, and any other cycle fails the run with `Workflow stalled` once the reachable nodes have run. No tool-call node ships, so a durable tool call is an executor you write yourself.

## Adding a new engine

1. Create `src/engines/<name>/` with:
   - a bootstrap (equivalent of `worker.ts`) that wires up `NodeExecutorRegistry` and connects to the queue
   - an adapter in `apps/backend/src/engine/<name>-engine.ts` implementing `WorkflowEnginePort`
2. Point `getWorkflowEngine()` in `apps/backend/src/engine/index.ts` at the new adapter (or add config-driven selection).
3. Reuse `runGraph` from `@workflow-builder/execution-core/workflow` — the graph traversal is engine-agnostic.

The domain layer (`execution-core`) never has to change.
