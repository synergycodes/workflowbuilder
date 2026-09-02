# @workflow-builder/execution-core

Pure mechanism for executing workflow graphs — no Temporal, no HTTP, no database, no node vocabulary. Defines ports, runs the graph topologically, and provides a registry mechanism that adapter packages (workers, engines) wire up against their own concrete node unions.

## Why it exists

The execution layer is split into hexagonal layers so the workflow engine (Temporal in the reference setup) and the node vocabulary can both be swapped without touching graph traversal logic.

```
backend route  ──▶  WorkflowEnginePort<TNode>  ──┐
                                                  ├──▶  TemporalWorkflowEngine  ──▶  Temporal
                                                  └──▶  (future) InMemoryEngine, BullMQEngine, …

worker         ──▶  runGraph<TNode>(input, ActivityRunnerPort<TNode>, EventEmitterPort)
                                                  │
                                                  └──▶  consumer's NodeExecutorRegistry<TNode>
```

`execution-core` owns the middle column: the ports, `runGraph`, the registry mechanism, and the template resolver. It owns nothing about any specific product's nodes.

## Two entry points

```json
"exports": {
  ".": "./src/index.ts",
  "./workflow": "./src/workflow.ts"
}
```

- `@workflow-builder/execution-core` — full surface: `runGraph`, ports, registry, `resolveExecutor`, template resolver, `NodeExecutionError`. Use from activities, tests, backend adapters.
- `@workflow-builder/execution-core/workflow` — sandbox-safe subset: `runGraph`, context type, ports only. Use from code running inside Temporal's V8 sandbox (`workflows/*.ts`).

The split exists because Temporal workflows run in a V8 sandbox that lacks `TransformStream`, `fetch`, and other Web APIs pulled in transitively by I/O-heavy executor code. Importing the root barrel from a workflow file would break the sandbox bundle.

## Generic over the consumer's node union

Everything that touches nodes is parameterized over `TNode extends BaseNode`. `BaseNode` is `{ id; type; config: unknown }` plus three optional runner-level fields — `label`, `errorPolicy` and `role` — which the layer that builds the `WorkflowExecutionInput` lifts out of the authored properties. That is the only thing the runner needs to know. Each consumer defines its own concrete discriminated union (e.g. `type AiStudioNode = TriggerNode | AiAgentNode | DecisionNode`) and binds it at the registry and port-instantiation sites; intersect the variants with `BaseNode` so those three stay declared.

```ts
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

type MyNode = { id: string; type: 'my/source' | 'my/transform'; config: { /* … */ } };

const registry: NodeExecutorRegistry<MyNode> = {
  'my/source':    (node, ctx) => /* … */,
  'my/transform': (node, ctx) => /* … */,
};
```

The mapped-type registry refuses to compile if a key drifts away from the union or if an executor's parameter shape doesn't match the variant for its key.

## Structure

```
src/
├── graph-runner.ts          # Topological scheduler over nodes/edges — engine-agnostic, generic in TNode
├── resolve-start-node.ts    # Entry-shape rule: exactly one `role: 'start'` node, no orphans
├── execution-context.ts     # Readonly context passed to every node executor
├── ports/
│   ├── workflow-engine.port.ts   # submit(), cancel() — implemented by adapters (TemporalWorkflowEngine, …)
│   ├── activity-runner.port.ts   # executeNode() — implemented by worker via proxyActivities
│   └── event-emitter.port.ts     # emitEvent(), updateStatus() — implemented by worker via proxyActivities
├── registry/                # NodeExecutorRegistry<TNode> mapped type + resolveExecutor<TNode>
└── templates/               # Variable/expression interpolation (`{{ nodes.x.output }}`)
```

Concrete executors and node configs live in the worker package that consumes them — see [`apps/execution-worker`](../../apps/execution-worker) for the AI Studio reference setup (`ai-studio/trigger`, `ai-studio/ai-agent`, `ai-studio/decision`) which builds against this core.

## Adding a new node executor (in a consumer package)

1. Define the node variant in your consumer package (e.g. `apps/<your-worker>/src/domain/<your>-nodes.ts`):

   ```ts
   export type MyTransformNode = {
     id: string;
     type: 'my-product/transform';
     config: { mode: 'lower' | 'upper' };
   };

   export type MyNode = MyTransformNode | /* other variants */;
   ```

2. Implement the executor — pure logic in `executors/<name>.ts`, async/with-I/O in `activities/<name>.ts`:

   ```ts
   import type { ExecutionContext } from '@workflow-builder/execution-core';

   import type { MyTransformNode } from '../domain/my-nodes';

   export function executeTransform(node: MyTransformNode, _ctx: ExecutionContext) {
     // …
   }
   ```

   An executor that returns `nextPort` promises a live route — see [Incomplete runs](#incomplete-runs) for what happens when nothing is wired to it.

3. Register it in your worker's `NodeExecutorRegistry<MyNode>`:

   ```ts
   const registry: NodeExecutorRegistry<MyNode> = {
     'my-product/transform': executeTransform,
     // …
   };
   ```

The registry's mapped type — `{ [K in TNode['type']]: NodeExecutor<Extract<TNode, { type: K }>> }` — gives you full narrowing: each entry's executor sees its variant's config concretely, with no casts.

## Per-node error policy

Each node can declare an `errorPolicy` on its `BaseNode` (sibling to `config`, as are `label` and `role`). The runner consults it after catching a node error and decides whether to propagate, absorb, or route the failure.

| Policy         | When the node throws                                                                                                                                                                                                                                                                                    | Use case                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `'fail'`       | (default) Emit `node_failed`, then abort the workflow with `execution_failed` and end the run as `{ status: 'failed' }`, which the engine adapter surfaces as a failed run (Temporal closes it as Failed).                                                                                              | Unrecoverable infra / programming bugs.                 |
| `'continue'`   | Emit `node_failed`, set `nodeOutputs[id] = { error: { message, code? } }`, schedule downstream nodes through every outgoing edge **except** those tagged with the reserved `'errorRoute'` handle.                                                                                                       | Best-effort steps; downstream inspects the error.       |
| `'errorRoute'` | Emit `node_failed`, set the same `{ error }` output, but only follow outgoing edges whose `sourceHandle === 'errorRoute'`. The success branch is pruned by the standard skip-propagation path. If no `'errorRoute'` edge exists, the run ends **incomplete** (see [Incomplete runs](#incomplete-runs)). | Retry-with-fallback, send-to-DLQ, compensating actions. |

`'errorRoute'` piggybacks on the same `nextPort` mechanism decision nodes use — non-`'errorRoute'` edges are pruned through the standard skip-propagation path, so deep dead branches stay dormant.

Only `'fail'` ends the run as failed. A node that fails under `'continue'` is absorbed by the graph: `node_failed` is still emitted, so the failure stays visible to anyone tailing events, but the run itself completes — `runGraph` returns `{ status: 'completed' }` and the engine reports a successful run. `'errorRoute'` absorbs the failure the same way only when the error port is actually routed; the same failure with no live `'errorRoute'` edge ends the run as `{ status: 'incomplete' }` — see [Incomplete runs](#incomplete-runs).

### `'errorRoute'` is a reserved `sourceHandle`

The string `'errorRoute'` is reserved as the runner's error-routing port name — deliberately the same literal as the policy, so the wiring reads consistently from schema to runner. Edges tagged with `sourceHandle === 'errorRoute'` fire **only** when the upstream node failed with policy `'errorRoute'`. Every other propagation path — success, `'continue'` on error, decision branching — prunes them. That means:

- A successful node with an unconnected error branch never fires it.
- A `'continue'` failure flows the error output to **regular** downstream edges only; the dedicated error branch stays dormant.
- Decision nodes must not use `'errorRoute'` as a branch handle.

```ts
const node: MyNode = {
  id: 'fetch-customer',
  type: 'my/http-call',
  config: { url: '…' },
  errorPolicy: 'errorRoute',
};
```

If a node with `'errorRoute'` policy fails but has no outgoing edge tagged `'errorRoute'`, the failure is recorded as `node_failed`, any regular branch it pruned reports `node_skipped` (see [Skipped nodes](#skipped-nodes)), and the run ends **incomplete** — the policy named a port and nothing was wired to it. See [Incomplete runs](#incomplete-runs). For deliberate absorption, use `'continue'` on a node with no downstream edges: it records `node_failed` and ends the branch without claiming a route it does not have.

## Skipped nodes

A node whose every incoming edge resolved without a live route never runs — a decision picked another branch, an `'errorRoute'` failure pruned the success branch, or the node sits downstream of one of those. The runner emits a `node_skipped` event for each, so an operator tailing the stream can tell "this node was never reached" from "this node is still pending".

| `payload.reason`          | Meaning                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `'branch_not_taken'`      | At least one predecessor ran and routed elsewhere — this is the head of the dead branch.        |
| `'upstream_skipped'`      | Every predecessor was itself skipped — this node sits deeper inside an already-dead branch.     |
| `'error_route_not_taken'` | The node hangs only off `'errorRoute'` edges whose sources never error-routed — nothing failed. |

`'error_route_not_taken'` is what a healthy run reports for the error handlers it never needed, so it reads apart from a branch something actively routed away from. It is the reason a UI would render quietly, or hide by default.

The reason does not depend on the order a node's predecessors happen to resolve in: one live-but-pruned incoming edge is enough to make it `'branch_not_taken'`, and a node hanging off both a routed-away branch and a dormant error edge reports `'branch_not_taken'` — the routing decision outranks the dormant handler.

Events are emitted once the whole wave has propagated, after that wave's `node_completed` events and before the next wave's `node_started`. A skipped node emits exactly one `node_skipped` and no `node_started`/`node_completed`, so it stays absent from `nodeOutputs` — downstream joins see only the live predecessors' outputs.

A wave that contains a fatal (`'fail'`) failure still emits the skips its surviving siblings produced, before the terminal `execution_failed` — a failed run is where the "never taken" / "never reached" distinction matters most. Nodes downstream of the fatal node itself emit nothing: they were never resolved, which is not the same as being skipped.

A `node_skipped` emit that exhausts its retries is swallowed and the run carries on. The event is advisory — a node that was never going to execute must not be able to abort an otherwise healthy run — and the sequence number the failed emit consumed leaves a gap the backend drain steps over.

## Incomplete runs

A run is **incomplete** when a node returned a non-empty `nextPort` and no outgoing edge went live. A falsy `nextPort` — `''`, or a `null` that unvalidated config lets through — counts as no port, mirroring the router, which treats a falsy `nextPort` as unrestricted routing. Each occurrence is a _dead end_, recorded as `{ nodeId, port }`; the run finishes everything else it can reach, then emits a single terminal `execution_incomplete` event naming every one of them, sets the execution status to `'incomplete'`, and returns `{ status: 'incomplete', deadEnds }`.

It is deliberately **not** a failure. Nothing threw, so the engine closes the run normally — the Temporal adapter returns rather than raising an `ApplicationFailure`, and the Workflow Execution shows as Completed. What changes is the run's own status, so an operator can tell "the graph ran" from "the graph ran everything it was supposed to".

| Shape                                                       | Outcome                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| A decision routes to a handle no edge carries               | **incomplete**                                                            |
| A decision node with no outgoing edges at all               | **incomplete**                                                            |
| An `'errorRoute'` failure with no `'errorRoute'` edge       | **incomplete**                                                            |
| A plain leaf (returns no `nextPort`)                        | completed                                                                 |
| A leaf whose `nextPort` is `''` (or otherwise falsy)        | completed — falsy means "no port", same as the router                     |
| A decision routes to a wired handle; other branches pruned  | completed, others `node_skipped`                                          |
| A successful node whose only outgoing edges are error edges | completed — `nextPort` is undefined, so the success path is simply a leaf |
| A `'continue'` failure on a leaf                            | completed                                                                 |
| Nodes that never became ready (a cycle)                     | **failed** — see below                                                    |

Failure always wins. An unhandled node failure returns before the terminal check, and the stall check runs ahead of it, so a run reports incomplete only where it would otherwise have reported completed.

`Workflow stalled: nodes never became ready` stays a **failure** and keeps its own name. A stall is the scheduler genuinely unable to proceed — a cycle, or a dangling-edge bug — where an incomplete run has finished and simply did not reach everything. Two different conditions, two different words.

## Recorded step inputs and payload redaction

Every `node_started` event records what the step was given: `{ config, visibleNodeIds }` — the node's frozen config plus the ids of every output visible at start (the same wave snapshot the executor receives; executors and templates may read any completed node's output, not just direct predecessors). The output _values_ are deliberately not copied: each is already recorded exactly once, at a lower sequence, in its own `node_completed` event — or `node_failed`, for a failure absorbed by errorPolicy `'continue'`/`'errorRoute'` — so copying them would grow Postgres, Temporal history, and the SSE stream quadratically with graph depth while adding no information. `reconstructNodeInputs(events, nodeId)` joins the ids back to the values and returns `{ config, nodeOutputs }`, a faithful record for diagnosing a failure or replaying a step with corrected input. `variables`, `global`, and `triggerPayload` are not recorded: the first is the server-side secrets bag, and the trigger payload is already frozen on the execution row. Events recorded before inputs were captured carry no payload, which is why `NodeStartedEvent.payload` is optional — `reconstructNodeInputs` returns `undefined` for those.

Every payload — inputs, outputs, errors — passes through `redactSensitive` (`redact.ts`) before it crosses `EventEmitterPort`. Event history is immutable on every surface it lands on (Postgres, SSE, and Temporal's own history via activity args), so secrets must never reach it in the first place; redacting inside the runner, before the emit activity, is what keeps all three surfaces clean. Matching is key-based (`SENSITIVE_KEY_RULES`: `apiKey`, `secret`, `password`, `*token`, …) and replaces the whole subtree under a matched key with `'[REDACTED]'`. The walk is copy-on-write — the unredacted objects continue on into execution — and depth-capped (see replay-audit rule 8). Secrets arriving through _values_ rather than keys (e.g. a resolved `{{variables.x}}` template) are not caught; that belongs to the variables feature (follow-up: value-based-redaction). Encrypting Temporal's own history, where `executeNode` activity args still carry real values, is planned separately (follow-up: temporal-payload-codec).

## Template references

`resolveTemplate(template, context)` (in `src/templates/`) interpolates `{{namespace.path}}` references against the live `ExecutionContext`. Three forms are supported - **strict by default**, with two opt-in modifiers for missing values:

| Form                                    | Behavior when the path resolves to `undefined` |
| --------------------------------------- | ---------------------------------------------- |
| `{{nodes.x.response}}`                  | throws `Unresolved template reference`         |
| `{{nodes.x.response?}}`                 | substitutes `''`                               |
| `{{nodes.x.response \| default:'tbd'}}` | substitutes the literal default                |

A modifier triggers **only when the resolved value is strictly `undefined`** - the namespace, node, or one of the dot-path segments does not exist on the live context. `null`, `''`, and `0` count as real values and pass through unchanged. The default literal is single-quoted and cannot contain a single quote; use `?` when you need an empty fallback.

The strict default is deliberate: a typo in a prompt template should fail the run, not silently leak a broken token into an LLM. The opt-in modifiers exist for fields where the absence of a value is a legitimate runtime state (an optional trigger field, an output that only exists on one branch of a decision).

Authors typing references in the workflow builder UI: see the [variable picker guide](https://www.workflowbuilder.io/docs/guides/use-variable-picker/).

## Adding a new workflow engine

1. Implement `WorkflowEnginePort<TNode>` (`submit`, `cancel`).
2. Wire it up in `apps/backend/src/engine/index.ts` (swap `TemporalWorkflowEngine` for the new adapter).
3. Make sure your engine wires `runGraph` (or equivalent traversal) to its activity primitives.
4. Translate a `{ status: 'failed' }` outcome from `runGraph` into your engine's own failure vocabulary. `runGraph` never throws for node failures — it reports them by return value — so an adapter that ignores the outcome will close failed runs as successful. See `run-workflow.ts` for the Temporal case, which raises `ApplicationFailure.nonRetryable` (only a `TemporalFailure` fails a Workflow Execution; anything else fails the workflow _task_ and retries it forever).

## Replay determinism

`runGraph` is **safe to run inside a Temporal workflow sandbox.** It is re-exported from `@workflow-builder/execution-core/workflow` precisely so it can sit on the workflow side of the activity boundary, and the algorithm is constrained to operations whose result is fully determined by `WorkflowExecutionInput`.

In practice this means:

- **No clock reads, no random.** `runGraph` does not call `Date.now()`, `new Date()`, `Math.random()`, or `crypto.randomUUID()`. Timestamps and IDs come from the caller (via `WorkflowExecutionInput`) or from activities (which record their own time outside the sandbox).
- **No I/O.** Every side effect — node execution, event emission, status updates — flows through `ActivityRunnerPort` / `EventEmitterPort`. The Temporal adapter implements these via `proxyActivities`, so Temporal caches their results in history and returns the same value on replay.
- **Deterministic iteration.** Internal state lives in `Map`s keyed by node id, populated in `definition.nodes` order. ES2015+ guarantees `Map` and `Set` iterate in insertion order, so `for…of` and spread (`{ ...nodeOutputs }`) traverse predictably.
- **Positional `Promise.all`.** Concurrent waves use `Promise.all`, which resolves with results in input order regardless of completion order. The runner reads positionally and never branches on which promise finished first; `Promise.race` and `Promise.any` are not used.
- **No top-level side effects.** `graph-runner.ts` only exports function declarations. Nothing reads the environment or instantiates dated objects at import time.

A regression test (`graph-runner.replay-determinism.test.ts`) runs each canonical topology (linear, fan-out, diamond, decision, skip, dead end, failure, stall) ten times against an identical deterministic port mock and asserts the resulting sequence of `EventEmitterPort` calls, statuses, and activity invocations is byte-equivalent across runs.

A full audit — every potential source of non-determinism enumerated with a verdict, plus maintenance rules for future contributors — lives in [`replay-audit.md`](./replay-audit.md). Read it before adding code that runs inside `runGraph`.

## Logging

Reference adapters and activity executors log through `LoggerPort` rather than calling `console` directly, so consumers can route output into pino, Datadog, Loki, or any other stack without forking.

```ts
export interface LoggerPort {
  debug(message: string, bindings?: LogBindings): void;
  info(message: string, bindings?: LogBindings): void;
  warn(message: string, bindings?: LogBindings): void;
  error(message: string, bindings?: LogBindings): void;
  child(bindings: LogBindings): LoggerPort;
}
```

`child(bindings)` returns a logger that merges the given fields into every subsequent line. Routes and executors layer in correlation IDs (`requestId`, `workflowId`, `executionId`, `nodeId`) once at the seam, so downstream sinks already have them in every record.

### Where logger lives

`LoggerPort` is **not** passed into `runGraph`, and `runGraph` does **not** import it. The runner is re-exported from the sandbox-safe entry (`@workflow-builder/execution-core/workflow`) and runs inside Temporal's V8 workflow context, where every call to `new Date()` poisons history replay. Lifecycle signals (`execution_started/completed/incomplete/failed`, `node_started/completed/failed`, `node_skipped`) already flow through `EventEmitterPort` — operators tail those for run-time observability of a workflow.

Use `LoggerPort` outside the sandbox — in HTTP routes, in activity executors (LLM calls, HTTP retries), at app startup.

```ts
import { createConsoleLogger } from '@workflow-builder/execution-core';

const logger = createConsoleLogger({ component: 'execution-worker' });

// inside an activity (lives outside the sandbox)
async function executeMyNode(node, context, deps: { logger: LoggerPort }) {
  try {
    return await callExternalService(node);
  } catch (error) {
    deps.logger.error('external call failed', {
      executionId: context.executionId,
      nodeId: node.id,
      error: { message: String(error) },
    });
    throw error;
  }
}
```

### Log levels

| Level   | Use for                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| `debug` | Per-node / per-step traces. Off by default in production; sinks filter by level.                              |
| `info`  | Lifecycle events at seams: HTTP request received, execute requested, cancel requested, worker started.        |
| `warn`  | Recoverable issues that callers should see: validation rejected, retry exhausted, fallback engaged.           |
| `error` | Unrecoverable failures with structured `{ error: { message, code? } }` shape (same as `node_failed` payload). |

Keep `error` payloads aligned with the corresponding `EventEmitterPort` event when one exists — an operator correlating an SSE event with a log line by `executionId` should see the same error shape on both sides.

### Console adapter

`createConsoleLogger` is the zero-dependency default. Pass `{ pretty: true }` in dev for human-readable single-line output; the default (JSON) is the production format that ships cleanly to structured sinks.

```ts
import { createConsoleLogger } from '@workflow-builder/execution-core';

export const logger = createConsoleLogger({ component: 'backend' }, { pretty: process.env.NODE_ENV !== 'production' });
```

### Swapping in pino (or anything else)

```ts
import pino, { type Logger } from 'pino';

import type { LogBindings, LoggerPort } from '@workflow-builder/execution-core';

function fromPino(pinoLogger: Logger): LoggerPort {
  return {
    debug: (message, bindings) => pinoLogger.debug(bindings ?? {}, message),
    info: (message, bindings) => pinoLogger.info(bindings ?? {}, message),
    warn: (message, bindings) => pinoLogger.warn(bindings ?? {}, message),
    error: (message, bindings) => pinoLogger.error(bindings ?? {}, message),
    child: (bindings: LogBindings) => fromPino(pinoLogger.child(bindings)),
  };
}

const logger = fromPino(pino({ level: 'info' }));
```

The same adapter pattern works for any logger that exposes leveled methods and a `child(bindings)` factory.
