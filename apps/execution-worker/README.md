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

See `.env.example`. Everything the bundled dev stack needs has a working default; the `AI_*` trio is optional:

| Var                  | Purpose                               | Default                                              |
| -------------------- | ------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`       | Execution events + status             | `postgresql://wb:wb@127.0.0.1:5432/workflow_builder` |
| `TEMPORAL_ADDRESS`   | Temporal server address               | `127.0.0.1:7233`                                     |
| `TEMPORAL_NAMESPACE` | Namespace. Must match the backend's   | `default`                                            |
| `AI_API_KEY`         | LLM for AI Agent nodes (optional)     | — (AI Agent nodes fail)                              |
| `AI_BASE_URL`        | Any OpenAI-compatible endpoint        | — (AI Agent nodes fail)                              |
| `AI_MODEL`           | Model id, as the endpoint spells it   | — (AI Agent nodes fail)                              |
| `TAVILY_API_KEY`     | AI Agent's web-search tool (optional) | — (tool disabled)                                    |

The three `AI_*` variables are optional by design, but all-or-nothing — the contract is described
once in [`@workflow-builder/ai-config`](../../packages/ai-config/README.md), which both apps read
through. The worker boots without them and runs every non-AI node, and an AI Agent node that is
reached fails with the `ai_not_configured` code rather than taking the whole worker down.
`AI_API_KEY` was previously called `OPENROUTER_API_KEY`; the old name is no longer read.

Point `AI_BASE_URL` at any OpenAI-compatible server — a gateway, or a model hosted inside your
own network — and model requests stay inside it. That covers the model only: the optional
web-search tool calls Tavily's API whenever `TAVILY_API_KEY` is set, a node enables web search and
the model invokes the tool, so leave the key unset if nothing may call out; Temporal and the
database go wherever `TEMPORAL_ADDRESS` and `DATABASE_URL` point. There is no built-in endpoint or model:
`.env.example` pre-fills the OpenRouter values the worker used before they became configurable.

The connection to Temporal is env-driven too: `TEMPORAL_TLS`, `TEMPORAL_API_KEY` and the
`TEMPORAL_TLS_CA_PATH` / `TEMPORAL_TLS_CERT_PATH` / `TEMPORAL_TLS_KEY_PATH` trio cover a hardened
cluster or Temporal Cloud. Both apps read them through
[`@workflow-builder/temporal-connection`](../../packages/temporal-connection/README.md), so the rules
cannot drift, but each environment must still agree on the namespace — the full table is in
[`apps/backend/README.md`](../backend/README.md#connecting-to-a-secured-temporal-cluster).

## Structure

```
src/
├── database.ts            # Raw SQL for exec events + status updates (no Drizzle — avoids backend schema coupling)
├── env.ts                 # Env reading with the defaults documented above (TEMPORAL_* come from @workflow-builder/temporal-connection)
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
- **Namespace:** `TEMPORAL_NAMESPACE`, default `default`. Unlike the task queue this is _not_ shared through the plugin: both apps read it through `@workflow-builder/temporal-connection`, but each environment has to set the same value — a mismatch is silent, the worker simply never sees the backend's submissions.
- **Workflow ID:** `execution-<executionId>` — deterministic, lets the backend cancel by execution ID. Also owned by the package.
- **Activity timeouts:** DB activities get 30s / 5 retries; node activities (may call LLMs) get 10m / 2 retries. Exported as `DEFAULT_DATABASE_ACTIVITY_PROFILE` and `DEFAULT_NODE_ACTIVITY_PROFILE`.
- **Retries per failure:** an executor throwing `PermanentNodeExecutionError` stops on its first attempt; `TransientNodeExecutionError` retries within the profile's limit. An unclassified throw keeps the profile's uniform retry. Every failure the reference executors make a judgment on is in the table below.
- **Sandbox constraint:** `workflows.ts` is bundled into V8 with no Web APIs. It may only re-export from `@workflowbuilder/temporal/workflow`, never from the package root.
- **Editing the package:** the worker imports its built `dist`, so run `pnpm build:temporal` after changing `packages/temporal/src`.
- **Deploys that widen the resolution envelope:** the update validator lives in the worker's workflow bundle and refuses an unknown resolution key. A backend that starts sending a new key before the workers accept it gets `verdict_malformed`, which the decision endpoint answers with 500. For independently deployed services the order is migrations, then workers, then the backend. The reference compose cannot express it: the backend is the migrator and the worker waits for it, so `docker compose up` recreates the backend first and leaves a window of seconds in which a reject answers 500 (see [`deploy/ai-studio/README.md`](../../deploy/ai-studio/README.md)). The `outcome` key shipped this way.
- **Deploys that change the emitted event set:** drain in-flight runs first. Replaying an old run's history against a new emit sequence diverges — see [`replay-audit.md`](../../packages/execution-core/replay-audit.md) rule 9.

### Failure classification

Each judgment is made at the throw site that owns the error. The runner and the adapter never infer a class from a status code, so a consumer's own executors are unaffected by this table.

| Failure                                                        | Class     | Code                                        |
| -------------------------------------------------------------- | --------- | ------------------------------------------- |
| AI Agent: provider answered 401 or 403                         | permanent | `provider_auth_rejected`                    |
| AI Agent: provider answered any other 4xx except 408 and 429   | permanent | `provider_rejected_request`                 |
| AI Agent: provider answered 429                                | transient | `provider_rate_limited`                     |
| AI Agent: provider answered 5xx                                | transient | `provider_unavailable`                      |
| AI Agent: provider answered 408, or the connection failed      | transient | `provider_unreachable`                      |
| AI Agent: structured answer ended on anything but `stop`       | transient | `structured_output_incomplete`              |
| AI Agent: `outputSchema` is not a JSON Schema of type `object` | permanent | `output_schema_invalid`                     |
| AI Agent: `AI_*` variables missing                             | permanent | `ai_not_configured`                         |
| AI Agent, Decision: template reference malformed or unresolved | permanent | `template_malformed`, `template_unresolved` |
| Decision: no branch matched                                    | permanent | `no_branch_matched`                         |
| Human decision: node carries no decision request               | permanent | `decision_request_missing`                  |

The provider's own error is attached as `cause`, and `node_failed` reports the deepest non-empty cause's text, so the provider's message reaches the UI as it did before classification. A refused connection is the exception: the SDK reports it as `Cannot connect to API:` with nothing after the colon, because the reason sits in an `AggregateError` it wraps — one entry per address tried. Only messages survive the activity boundary, so the classifier attaches the first entry (`connect ECONNREFUSED ::1:11434`) as the cause instead of the SDK error. The classifier's own message, which names the HTTP status, is one level up and visible only in Temporal's failure record. 409 is permanent on purpose, unlike the AI SDK's own retry default: no chat provider is known to answer 409 for a condition a retry would clear. Two kinds of SDK error stay unclassified and keep the profile's uniform retry: a response the SDK could not parse (a 2xx with a non-JSON body, typically a proxy answering with HTML) and errors raised without any provider response (a malformed tool call from the model, no output generated), which describe model behaviour a retry can change. Marking a failure transient does not buy extra attempts — the node profile still caps them.

## AI Agent structured output

An AI Agent node may carry `outputSchema`, a JSON Schema object. The executor then asks the model for an answer matching it and the node's output is the parsed answer, with no `response` key beside it. Without the key the node keeps returning `{ response: text }`. Web search runs in either mode; its loop allows four steps and sends `tool_choice: 'none'` on the last, so the model answers instead of searching again. A value without `type: 'object'` at its root fails the node as a permanent `output_schema_invalid` before any model call. A top-level `response` or `input` string is best avoided: an AI Agent downstream reads that one field as the whole output and drops the rest.

The model is created with `supportsStructuredOutputs: true`. Without that flag the OpenAI-compatible provider drops the schema, sends plain JSON mode and only records a warning, so the keys would come from the model's guess. The provider sends `strict: true` by default. OpenAI's strict mode requires the schema to list every property in `required` and set `additionalProperties: false`; an endpoint that refuses the schema answers 4xx, which [Failure classification](#failure-classification) makes permanent. The endpoint has to support the `json_schema` response format at all. OpenRouter's documentation says it honours it only on models that advertise structured outputs, so check the model before a demo.

The schema is forwarded untouched and the answer is not validated against it: for a plain JSON Schema the SDK only parses the answer as JSON, so an endpoint that ignores the schema hands the node whatever JSON came back. An answer the SDK cannot parse into JSON stays unclassified, as [Failure classification](#failure-classification) explains. An answer that ends on anything but a `stop` finish, whether truncated (`length`), filtered (`content-filter`), or still calling a tool on the loop's last step (`tool-calls`, from an endpoint that ignores `tool_choice: 'none'`), fails the node as a transient `structured_output_incomplete`, whose message names the finish reason the SDK's own `No output generated.` leaves out.

## Adding a new engine

1. Create `src/engines/<name>/` with:
   - a bootstrap (equivalent of `worker.ts`) that wires up `NodeExecutorRegistry` and connects to the queue
   - an adapter in `apps/backend/src/engine/<name>-engine.ts` implementing `WorkflowEnginePort`
2. Point `getWorkflowEngine()` in `apps/backend/src/engine/index.ts` at the new adapter (or add config-driven selection).
3. Reuse `runGraph` from `@workflow-builder/execution-core/workflow` — the graph traversal is engine-agnostic.

The domain layer (`execution-core`) never has to change.
