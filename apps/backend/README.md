# AI Studio — Execution Backend

> ⚠️ **Reference implementation, local development only.**
> No real authentication. The bundled `AllowAllAuthPort` permits every caller and every action (see `src/auth/`), and the constructor refuses to start without the explicit `WB_AUTH_PORT=allow-all` opt-in so a forgotten env var fails loudly. No tenant isolation. The HTTP server and the docker-compose services bind to `127.0.0.1` by default. Do not expose to the internet or shared networks without first plugging in a real `AuthPort`, see [`auth-port.decision-log.md`](./auth-port.decision-log.md) for the seam, default, and a JWT adapter sketch.
>
> Seams for consumers to plug in: [`AuthPort`](./auth-port.decision-log.md) for authn/authz, [`TenantContextPort`](./tenant-context-port.decision-log.md) for multi-tenant identity propagation (wiring guide: [`multi-tenancy.md`](./multi-tenancy.md)).

> **Note:** setup is in [root README "Path C. Run the full stack demo"](../../README.md#path-c-run-the-full-stack-demo). This file documents the backend's internals, not how to start it.

Backend execution layer for Workflow Builder AI Studio plugin. Runs AI workflows defined on the canvas via Temporal and an OpenAI-compatible LLM endpoint (`AI_BASE_URL`).

## Architecture

Hexagonal — the backend depends on **ports**, not on Temporal. The Temporal-backed adapter is swappable.

```
Frontend (React)
     │                                                  ┌── execute node (AI agent, decision, …)
     ▼                                                  │
 Backend (Hono) ──▶ WorkflowEnginePort ──▶ Temporal ──▶ Worker ──┼── emit event → Postgres
     ▲                 │                                  │      │
     │                 └─ impl: TemporalWorkflowEngine    │      └── update status → Postgres
     └── SSE stream (Postgres LISTEN/NOTIFY) ◀────────────┘
```

- **Backend** (`apps/backend`) — Hono HTTP server, workflow CRUD, SSE streaming via Postgres LISTEN/NOTIFY. Submits executions through `WorkflowEnginePort`.
- **Engine adapter** (`apps/backend/src/engine/index.ts`) — wires `TemporalWorkflowEngine` from [`@workflowbuilder/temporal/client`](../../packages/temporal/README.md), which implements `WorkflowEnginePort` against Temporal. Swap what this file constructs to switch engines.
- **Worker** (`apps/execution-worker`) — Temporal worker. Activities delegate node execution to `execution-core`. See the [worker README](../execution-worker/README.md).
- **Domain** (`packages/execution-core`) — pure graph runner + ports + node executors. No Temporal, no HTTP. See the [execution-core README](../../packages/execution-core/README.md).
- **Frontend** (`apps/ai-studio`) — full AI workflow product. Composes `@workflowbuilder/sdk` directly via JSX, with a slim plugin only for per-node execution markers. Owns Play/Stop controls, log panel, node detail, and execution highlighting.

## Decision request on a node

A node asks a human for a decision by carrying `data.properties.decisionRequest`: the actions offered, the JSON Schema of the form, the node whose output is judged, and an optional deadline. Any node type may carry one: the backend and the decision endpoint find the request by this field, never by `type`. The mapper lifts it to `BaseNode.decisionRequest`, out of `config`.

The runner does not read the field, deliberately: it learns no product's vocabulary, so a run stops where a node's executor returns a waiting result. A request on a node that never parks therefore validates, reaches the worker and asks nobody anything. The node whose executor does nothing but park is `ai-studio/human-decision`: `apps/execution-worker/src/executors/human-decision.ts` returns `{ waiting: true }`, and `apps/ai-studio/src/nodes/human-decision/` renders one output handle per action that carries a port.

The request is validated on `POST /:id/publish` and `POST /:id/execute`, never on `PATCH /:id/draft`: a draft is legitimately mid-edit. A broken request answers with the existing `invalid_snapshot` 400, whose `details[].path` points at the node index and field, for example `nodes.1.data.properties.decisionRequest.actions.1.effect`. A `resume` or `reject` action always names its `port`: a port is the id of an output handle on the canvas, and the backend supplies no default for it. A `rerun-source` action takes no port, because it does not route. A request offers one or more `resume` actions, each its own branch, at most one `reject` and at most one `rerun-source`. Every routed action has its own port: a port two actions share is refused as `duplicate_port` on the later one. A node that carries a request may not set `errorPolicy: 'continue'`, since a failure would then light every port at once; `fail` and `errorRoute` are accepted. Structural issues come first; the graph rules (proposal source, predecessors) run once the structure parses, so a second round of issues can follow a fix. Every domain message the validation can produce is listed in `src/domain/decision/decision-issues.ts`. Each such detail also carries `domainCode`, its key in that dictionary, and `params` with the value the message interpolates, so a client branches and translates on the identifier and never on the wording; `code` stays zod's own.

One key is refused outright, wherever it sits. An own `__proto__` anywhere in the snapshot answers `invalid_snapshot` 400 naming its path: `JSON.parse` turns it into an ordinary key, and a loose object copies unknown keys by assignment, which for that one swaps the parsed output's prototype and hands the engine a request no schema ever saw. The check does not weigh position, so it also refuses a `__proto__` buried inside an opaque node property, where zod never copies keys one by one and the key is inert. A node type that keeps a raw JSON document in `data.properties` therefore cannot carry one.

A submitted decision is checked against the request by `validateSubmittedDecision` in `src/domain/decision/` and delivered by the endpoint below. Shape, rules and the reasoning are in [`decision-request.decision-log.md`](./decision-request.decision-log.md).

### Deciding: `POST /api/executions/:id/decision`

Body: `{ nodeId, attempt, action, edits?, reason?, comment? }`. `action` is the `name` of one of the node's actions. `attempt` is how many times the node has parked in this run (its `node_waiting` count; today always 1). `edits` are a patch of the proposal for whoever reads the decision to apply; the node's output carries them unapplied. Nothing applies them yet, so a step after the decision that reads the source's output sees the proposal without the corrections (follow-up: decision-settled-values). An object merges field by field and a list element by element, so a field whose schema declares `properties` or `items` must keep that shape; only `null` also passes, where the field's `type` allows it. Checks run in this order, each answering before the next: row, authorization (`executions:decide` with the row's `{ workflowId, tenantId, status }`; a deny wins over 404), status, body, node, decision, `attempt`, effect, engine. The engine is asked once; nothing is retried. Success: `200 { executionId, nodeId, attempt, action, effect }`. Codes and messages live in `src/routes/decision-refusals.ts`.

The route stamps `resolvedBy: 'human'` on the decision; a body naming an initiator is ignored. A decision on any `resume` action continues the run on that action's port and declares no outcome. A `reason` is accepted with any action and required only where a `reject` sets `reasonRequired`. A `reject` also declares the run's outcome, edge or no edge: the run closes `completed` unless another branch ends it `incomplete` or `failed`, `GET /api/executions/:id` answers `outcome: 'rejected'` and `resolvedBy: 'human'` (`null` otherwise), and `execution_completed` carries `{ outcome: { value, resolvedBy, nodeId } }`. Publish requires no edge on a reject port.

| Status | Code                        | When                                                                                                                                  |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `validation_error`          | Body shape                                                                                                                            |
| 400    | `invalid_decision`          | Submission against the request; `details[0].code` is a `SUBMITTED_DECISION_ERRORS` key                                                |
| 404    | `execution_not_found`       |                                                                                                                                       |
| 404    | `node_not_found`            | Not in the run's snapshot                                                                                                             |
| 409    | `execution_not_waiting`     | Terminal or cancelling run, or the engine no longer has it                                                                            |
| 409    | `node_not_waiting`          | No request on the node, never parked, or not waiting now. Final                                                                       |
| 409    | `decision_already_made`     | The first decision won, whoever sent it                                                                                               |
| 409    | `decision_attempt_mismatch` | Body carries the current `attempt`                                                                                                    |
| 501    | `effect_not_supported`      | `rerun-source`, until the engine can re-run a source                                                                                  |
| 503    | `decision_delivery_timeout` | No worker accepted it in time. It may still land: resend (`Retry-After`); `decision_already_made` then names the wait, not the sender |

### Trying several resume actions on the local stack

A review with two normal outcomes and a rejection: `complete` and `incomplete` are both `resume` actions, each on its own port with its own next node; `reject` has no edge, which is a deliberate end. The run below never reaches an AI node. Save this as `review.json`:

```json
{
  "name": "Review with two outcomes",
  "draftJson": {
    "nodes": [
      {
        "id": "trigger-1",
        "type": "start-node",
        "position": { "x": 0, "y": 200 },
        "data": {
          "isStartNode": true,
          "type": "ai-studio/trigger",
          "icon": "Lightning",
          "segments": [],
          "properties": { "label": "Case received", "description": "", "inputPrompt": "" }
        }
      },
      {
        "id": "review-1",
        "type": "ai-studio/human-decision",
        "position": { "x": 350, "y": 200 },
        "data": {
          "type": "ai-studio/human-decision",
          "icon": "UserCheck",
          "segments": [],
          "properties": {
            "label": "Review",
            "description": "",
            "decisionRequest": {
              "version": 1,
              "actions": [
                { "name": "complete", "label": "Complete", "effect": "resume", "port": "source:inner:complete" },
                { "name": "incomplete", "label": "Incomplete", "effect": "resume", "port": "source:inner:incomplete" },
                {
                  "name": "reject",
                  "label": "Reject",
                  "effect": "reject",
                  "port": "source:inner:rejected",
                  "reasonRequired": true
                }
              ],
              "schema": { "type": "object", "properties": {} }
            }
          }
        }
      },
      {
        "id": "done-1",
        "type": "node",
        "position": { "x": 700, "y": 100 },
        "data": {
          "type": "ai-studio/visualize",
          "icon": "Eye",
          "segments": [],
          "properties": { "label": "Complete", "description": "", "mode": "json" }
        }
      },
      {
        "id": "hold-1",
        "type": "node",
        "position": { "x": 700, "y": 300 },
        "data": {
          "type": "ai-studio/visualize",
          "icon": "Eye",
          "segments": [],
          "properties": { "label": "Incomplete", "description": "", "mode": "json" }
        }
      }
    ],
    "edges": [
      {
        "id": "e-trigger-review",
        "source": "trigger-1",
        "sourceHandle": "source",
        "target": "review-1",
        "targetHandle": "target",
        "type": "labelEdge",
        "data": {}
      },
      {
        "id": "e-review-done",
        "source": "review-1",
        "sourceHandle": "source:inner:complete",
        "target": "done-1",
        "targetHandle": "target",
        "type": "labelEdge",
        "data": {}
      },
      {
        "id": "e-review-hold",
        "source": "review-1",
        "sourceHandle": "source:inner:incomplete",
        "target": "hold-1",
        "targetHandle": "target",
        "type": "labelEdge",
        "data": {}
      }
    ]
  }
}
```

With the backend on 3001 and a worker running (`pnpm infra:up`, then `pnpm dev:backend` and `pnpm dev:worker`, or `pnpm dev:ai-studio` for all three):

```bash
WF=$(curl -s -X POST localhost:3001/api/workflows -H 'content-type: application/json' -d @review.json | jq -r .id)
curl -s -X POST localhost:3001/api/workflows/$WF/publish > /dev/null
RUN=$(curl -s -X POST localhost:3001/api/workflows/$WF/execute -H 'content-type: application/json' \
  -d '{"sourceVersion":"published","triggerPayload":{"input":"Case 48213"}}' | jq -r .executionId)
curl -s localhost:3001/api/executions/$RUN | jq .status
# "waiting", once the node has parked; repeat until it is
curl -s -X POST localhost:3001/api/executions/$RUN/decision -H 'content-type: application/json' \
  -d '{"nodeId":"review-1","attempt":1,"action":"incomplete"}' | jq .effect
# "resume"
curl -s localhost:3001/api/executions/$RUN | jq '{status, outcome}'
# { "status": "completed", "outcome": null }: the run took the incomplete branch and no outcome was declared
```

A second run decided with `"action":"complete"` takes the other branch; one decided with `"action":"reject"` needs a `reason` and ends with `"outcome": "rejected"`. AI Studio opens the workflow at `?workflowId=$WF` and the run at `?executionId=$RUN`: the canvas draws one handle per routed action, while the decision form offers the first `resume` action only, for now.

## Listing executions: `GET /api/executions`

Newest first, filtered and paged. Query: `status` (one `ExecutionStatus`), `workflowId` (a UUID), `limit` (default 50, capped at 200; a larger value is clamped, not refused), `cursor` (opaque, taken from the previous page's `nextCursor`). Success: `200 { items, nextCursor }`, `nextCursor` is `null` on the last page. Items carry summary fields only (`id`, `workflowId`, `sourceVersion`, `status`, `startedAt`, `finishedAt`, `createdAt`): no snapshot, no trigger payload, no outputs. Authorization is `executions:list` on `{ kind: 'executions' }`, checked before the query string is read. With a tenant context the list holds the caller's rows plus untenanted rows, the stream route's rule applied as a filter; without one, every row. An empty value counts as absent. Paging is keyset on `(date_trunc('milliseconds', created_at), id)`, not on the raw column: the cursor carries the millisecond `createdAt` the client saw, so both sides of the comparison are truncated the same way. A run submitted between two requests lands on top and never repeats or shifts the pages that follow. A run whose insert committed after a page was read but whose `created_at` predates the cursor is returned mid-walk, on a later page — the predicate only asks for rows older than the cursor. The reverse is the case a walk cannot show: a row whose `created_at` is newer than the cursor stays invisible until the client restarts from a fresh first page. No index serves this order: every page sorts the whole matching set, and `status` or `workflowId` narrow what is scanned but not what is sorted. The two-argument `date_trunc` used here depends on the session `TimeZone` and is therefore STABLE, so it cannot appear in an expression index; the three-argument `date_trunc('milliseconds', created_at, 'UTC')` is IMMUTABLE and returns the same values, so switching to it allows an index on `(date_trunc('milliseconds', created_at, 'UTC'), id)`. Storing `created_at` as `timestamptz(3)` is the other route; it rounds where the current key truncates, so a cursor minted before that migration repeats one row once (follow-up: executions-created-at-millis). A cursor minted under one filter stays valid under another.

| Status | Code                  | When                                                                                                                                    |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `invalid_status`      | Not an `ExecutionStatus`; a typo never yields an empty list                                                                             |
| 400    | `invalid_workflow_id` | Not a UUID                                                                                                                              |
| 400    | `invalid_limit`       | Not a positive integer                                                                                                                  |
| 400    | `invalid_cursor`      | Not a canonical `<ISO timestamp>\|<UUID>` pair in base64url: the cursor is an opaque window position, validated on shape, not on origin |
| 400    | `tenant_required`     | A tenant context resolved without an id: a broken `TenantContextPort` adapter, refused rather than read as single-tenant                |

Under the `AllowAllAuthPort` the route answers `403 listing_disabled` unless `ENABLE_WB_LISTING=true`, like `GET /api/workflows`; see [Environment](#environment).

## The graph a run executed: `GET /api/executions/:id/snapshot`

Success: `200 { workflowId, sourceVersion, snapshot }`. `snapshot` is the workflow JSON the execute route copied into the run, as it was stored: editing or publishing the workflow afterwards leaves it unchanged. It is a route of its own, not a field of `GET /api/executions/:id`, because pollers call that one. Authorization is `executions:read` on `{ kind: 'execution', executionId }`, the same as `GET /api/executions/:id`, checked before the id is read.

| Status | Code                  | When                |
| ------ | --------------------- | ------------------- |
| 404    | `execution_not_found` | No run with this id |

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

Both also read `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL` — all three or none, through
[`@workflow-builder/ai-config`](../../packages/ai-config/README.md), which is the canonical description
of that contract. Each side degrades on its own when they are missing: the backend's AI adapt endpoint
returns 501, and the worker runs everything except AI Agent nodes. See
[`apps/execution-worker/README.md`](../execution-worker/README.md).

When `server.ts` runs the `AllowAllAuthPort`, the two collection routes, `GET /api/workflows` and `GET /api/executions`, answer `403 listing_disabled` unless `ENABLE_WB_LISTING=true`: a workflow or a run is then private only while its random id stays unlisted, so a forgotten variable must not list every id. With any other `AuthPort` the variable is not read, and the port authorizes `workflows:list` and `executions:list` itself. The local `.env.example` sets it; the deploy leaves it unset. A new collection route goes into `LISTING_PATHS` in `src/middleware/listing-guard.ts`.

### Connecting to a secured Temporal cluster

The defaults above open a plaintext connection to the bundled dev cluster. Everything about the
connection is env-driven, so a hardened cluster or Temporal Cloud needs no code change. The
variables are read and validated by [`@workflow-builder/temporal-connection`](../../packages/temporal-connection/README.md),
the same code the worker uses:

| Var                      | Purpose                                                      | Default       |
| ------------------------ | ------------------------------------------------------------ | ------------- |
| `TEMPORAL_NAMESPACE`     | Namespace to use. Must match the worker's                    | `default`     |
| `TEMPORAL_TLS`           | `true` requires TLS, `false` asserts plaintext, empty infers | empty (infer) |
| `TEMPORAL_API_KEY`       | API key auth (Temporal Cloud). Implies TLS                   | —             |
| `TEMPORAL_TLS_CA_PATH`   | PEM for a private certificate authority                      | —             |
| `TEMPORAL_TLS_CERT_PATH` | Client certificate for mTLS. Set with the key                | —             |
| `TEMPORAL_TLS_KEY_PATH`  | Client private key for mTLS. Set with the certificate        | —             |

Any credential turns TLS on by itself, so `TEMPORAL_TLS` only has to be set to force TLS with no
credentials, or to assert plaintext. Contradictory combinations — half an mTLS pair, an API key
together with a client certificate, or credentials alongside `TEMPORAL_TLS=false` — are rejected
with an explanatory error at startup, rather than being silently ignored. The connection itself is
opened on the first run, so booting does not require Temporal to be reachable.

For Temporal Cloud, set `TEMPORAL_ADDRESS` to `<namespace>.<accountId>.tmprl.cloud:7233`,
`TEMPORAL_NAMESPACE` to `<namespace>.<accountId>`, and `TEMPORAL_API_KEY` to your key.

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
