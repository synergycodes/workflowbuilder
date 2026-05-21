# @workflow-builder/execution-core

Pure mechanism for executing workflow graphs — no Temporal, no HTTP, no database, no node vocabulary. Defines ports, runs the graph topologically, and provides a registry mechanism that adapter packages (workers, engines) wire up against their own concrete node unions.

## Why it exists

The execution layer is split into hexagonal layers so the workflow engine (Temporal in the reference setup) and the node vocabulary can both be swapped without touching graph traversal logic.

```
backend route  ──▶  WorkflowEnginePort<TNode>  ──┐
                                                  ├──▶  TemporalEngine  ──▶  Temporal
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

Everything that touches nodes is parameterized over `TNode extends BaseNode`. `BaseNode` is `{ id; type; config: unknown }` — the only thing the runner needs to know. Each consumer defines its own concrete discriminated union (e.g. `type AiStudioNode = TriggerNode | AiAgentNode | DecisionNode`) and binds it at the registry and port-instantiation sites.

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
├── execution-context.ts     # Readonly context passed to every node executor
├── ports/
│   ├── workflow-engine.port.ts   # submit(), cancel() — implemented by adapters (TemporalEngine, …)
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

3. Register it in your worker's `NodeExecutorRegistry<MyNode>`:

   ```ts
   const registry: NodeExecutorRegistry<MyNode> = {
     'my-product/transform': executeTransform,
     // …
   };
   ```

The registry's mapped type — `{ [K in TNode['type']]: NodeExecutor<Extract<TNode, { type: K }>> }` — gives you full narrowing: each entry's executor sees its variant's config concretely, with no casts.

## Per-node error policy

Each node can declare an `errorPolicy` on its `BaseNode` (sibling to `config`). The runner consults it after catching a node error and decides whether to propagate, absorb, or route the failure.

| Policy       | When the node throws                                                                                                                                                                         | Use case                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `'fail'`     | (default) Emit `node_failed`, then abort the workflow with `execution_failed`.                                                                                                               | Unrecoverable infra / programming bugs.                 |
| `'continue'` | Emit `node_failed`, set `nodeOutputs[id] = { error: { message, code? } }`, schedule downstream nodes through every outgoing edge **except** those tagged with the reserved `'error'` handle. | Best-effort steps; downstream inspects the error.       |
| `'route'`    | Emit `node_failed`, set the same `{ error }` output, but only follow outgoing edges whose `sourceHandle === 'error'`. The success branch is pruned by the standard skip-propagation path.    | Retry-with-fallback, send-to-DLQ, compensating actions. |

`'route'` piggybacks on the same `nextPort` mechanism decision nodes use — non-`'error'` edges are pruned through the standard skip-propagation path, so deep dead branches stay dormant.

### `'error'` is a reserved `sourceHandle`

The string `'error'` is reserved as the runner's error-routing port name. Edges tagged with `sourceHandle === 'error'` fire **only** when the upstream node failed with policy `'route'`. Every other propagation path — success, `'continue'` on error, decision branching — prunes them. That means:

- A successful node with an unconnected error branch never fires it.
- A `'continue'` failure flows the error output to **regular** downstream edges only; the dedicated error branch stays dormant.
- Decision nodes must not use `'error'` as a branch handle.

```ts
const node: MyNode = {
  id: 'fetch-customer',
  type: 'my/http-call',
  config: { url: '…' },
  errorPolicy: 'route',
};
```

If a node with `'route'` policy fails but has no outgoing edge tagged `'error'`, the run completes cleanly — the failure is recorded as `node_failed` and nothing else fires. That makes `'route'` usable as a silent DLQ when paired with downstream observability on `node_failed` events.

## Adding a new workflow engine

1. Implement `WorkflowEnginePort<TNode>` (`submit`, `cancel`).
2. Wire it up in `apps/backend/src/engine/index.ts` (swap `TemporalEngine` for the new adapter).
3. Make sure your engine wires `runGraph` (or equivalent traversal) to its activity primitives.

## Replay determinism

`runGraph` is **safe to run inside a Temporal workflow sandbox.** It is re-exported from `@workflow-builder/execution-core/workflow` precisely so it can sit on the workflow side of the activity boundary, and the algorithm is constrained to operations whose result is fully determined by `WorkflowExecutionInput`.

In practice this means:

- **No clock reads, no random.** `runGraph` does not call `Date.now()`, `new Date()`, `Math.random()`, or `crypto.randomUUID()`. Timestamps and IDs come from the caller (via `WorkflowExecutionInput`) or from activities (which record their own time outside the sandbox).
- **No I/O.** Every side effect — node execution, event emission, status updates — flows through `ActivityRunnerPort` / `EventEmitterPort`. The Temporal adapter implements these via `proxyActivities`, so Temporal caches their results in history and returns the same value on replay.
- **Deterministic iteration.** Internal state lives in `Map`s keyed by node id, populated in `definition.nodes` order. ES2015+ guarantees `Map` and `Set` iterate in insertion order, so `for…of` and spread (`{ ...nodeOutputs }`) traverse predictably.
- **Positional `Promise.all`.** Concurrent waves use `Promise.all`, which resolves with results in input order regardless of completion order. The runner reads positionally and never branches on which promise finished first; `Promise.race` and `Promise.any` are not used.
- **No top-level side effects.** `graph-runner.ts` only exports function declarations. Nothing reads the environment or instantiates dated objects at import time.

A regression test (`graph-runner.replay-determinism.test.ts`) runs each canonical topology (linear, fan-out, diamond, decision, failure, stall) ten times against an identical deterministic port mock and asserts the resulting sequence of `EventEmitterPort` calls, statuses, and activity invocations is byte-equivalent across runs.

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

`LoggerPort` is **not** passed into `runGraph`, and `runGraph` does **not** import it. The runner is re-exported from the sandbox-safe entry (`@workflow-builder/execution-core/workflow`) and runs inside Temporal's V8 workflow context, where every call to `new Date()` poisons history replay. Lifecycle signals (`execution_started/completed/failed`, `node_started/completed/failed`) already flow through `EventEmitterPort` — operators tail those for run-time observability of a workflow.

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
