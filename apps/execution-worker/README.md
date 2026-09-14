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

Optional, per-provider direct-routing keys — none is declared here or in `env.ts`; each is read
directly by its own `@ai-sdk/<x>` package only when an `ai-agent` node selects that `provider`
explicitly (or `'auto'` infers it from the model-id prefix). Presence is checked with
`Boolean(process.env.<VAR>)`; the key value itself is never read, stored, or logged by this app.

| Provider     | Env var                        |
| ------------ | ------------------------------ |
| `openai`     | `OPENAI_API_KEY`               |
| `anthropic`  | `ANTHROPIC_API_KEY`            |
| `google`     | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `xai`        | `XAI_API_KEY`                  |
| `mistral`    | `MISTRAL_API_KEY`              |
| `cohere`     | `COHERE_API_KEY`               |
| `deepseek`   | `DEEPSEEK_API_KEY`             |
| `moonshotai` | `MOONSHOT_API_KEY`             |
| `groq`       | `GROQ_API_KEY`                 |
| `togetherai` | `TOGETHER_API_KEY`             |
| `fireworks`  | `FIREWORKS_API_KEY`            |
| `perplexity` | `PERPLEXITY_API_KEY`           |
| `cerebras`   | `CEREBRAS_API_KEY`             |
| `deepinfra`  | `DEEPINFRA_API_KEY`            |

An `ai-agent` node's `model`/`provider` config fields fall back to `env.AI_MODEL`/`'auto'` when
unset (`apps/execution-worker/src/model-provider.ts`). `provider` accepts free text for a value
not yet in this table — that currently fails at execution with a clear error until support (a
table row plus its `@ai-sdk/<x>` dependency) is added.

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

## Adding a new engine

1. Create `src/engines/<name>/` with:
   - a bootstrap (equivalent of `worker.ts`) that wires up `NodeExecutorRegistry` and connects to the queue
   - an adapter in `apps/backend/src/engine/<name>-engine.ts` implementing `WorkflowEnginePort`
2. Point `getWorkflowEngine()` in `apps/backend/src/engine/index.ts` at the new adapter (or add config-driven selection).
3. Reuse `runGraph` from `@workflow-builder/execution-core/workflow` — the graph traversal is engine-agnostic.

The domain layer (`execution-core`) never has to change.
