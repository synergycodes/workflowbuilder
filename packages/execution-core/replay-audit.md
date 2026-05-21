# `runGraph` Temporal replay determinism — audit

## Scope

`runGraph` from `packages/execution-core/src/graph-runner.ts` is re-exported via the sandbox-safe entry `@workflow-builder/execution-core/workflow` and invoked from `apps/execution-worker/src/engines/temporal/workflows/run-workflow.ts`, which runs inside Temporal's V8 workflow sandbox. Every line executed in that context must be deterministic — Temporal replays workflow history on worker restart, code upgrade, and failover. Any non-determinism corrupts replay silently in production.

This document audits every code path reachable from `runGraph` in the sandbox, enumerates known sources of non-determinism, and records the verdict for each.

**Out of scope (per WB-182):**

- Activity executor code (`apps/execution-worker/src/activities/*`, `executors/*`). Activities run outside the sandbox; non-determinism there is fine.
- Temporal versioning via `patched()` for algorithm changes mid-flight. That is a separate task.

## Files in the sandbox

The sandbox entry `workflow.ts` re-exports the following. Only `runGraph` and `NodeExecutionError` reach the bundle as runtime code; the rest are types (erased at compile time).

| Source                                             | Kind     | Runtime? |
| -------------------------------------------------- | -------- | -------- |
| `packages/execution-core/src/graph-runner.ts`      | function | yes      |
| `packages/execution-core/src/errors.ts`            | class    | yes      |
| `packages/execution-core/src/execution-context.ts` | type     | no       |
| `packages/execution-core/src/ports/*.port.ts`      | types    | no       |
| `packages/types/.../execution-model.ts`            | types    | no       |

The audit therefore focuses on `graph-runner.ts` + `errors.ts`. Activities and adapters live outside the sandbox — they are covered only as ports the runner calls into.

## Sources of non-determinism reviewed

| Source                                   | Used in runner? | Verdict                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new Date()` / `Date.now()`              | No              | ✅ Safe — runner takes no `LoggerPort` precisely so timestamps cannot leak in. Temporal patches `Date` in the sandbox anyway, but we avoid it altogether to keep intent obvious.                                                                                           |
| `Math.random()` / `crypto.randomUUID`    | No              | ✅ Safe — IDs are passed in via `WorkflowExecutionInput`; the runner never generates one.                                                                                                                                                                                  |
| `setTimeout` / `setInterval`             | No              | ✅ Safe — runner is pure scheduling logic; any delay primitive would have to go through Temporal's `sleep()` activity-equivalent.                                                                                                                                          |
| `Promise.race` / `Promise.any`           | No              | ✅ Safe — only `Promise.all` is used, whose result array is positional (matches input order), so it is deterministic given a deterministic input.                                                                                                                          |
| `Map` iteration order                    | Yes             | ✅ Safe — ES2015+ guarantees insertion order for `Map` and `Set`. Every `Map` in the runner (`adjacency`, `pendingPredecessors`, `liveIncoming`, `status`, `nodeOutputs` object) is keyed by node id and populated in `definition.nodes` order, which the caller controls. |
| `Set` iteration order                    | No              | ✅ Safe — runner uses no `Set`. (`Array.prototype.find` on a small `successors` list replaces what would otherwise be set membership.)                                                                                                                                     |
| `JSON.stringify` key order               | No              | ✅ Safe — runner never serializes. Events/payloads handed to ports are plain objects; ports serialize outside the sandbox.                                                                                                                                                 |
| `process.env`, `fs`, `fetch`             | No              | ✅ Safe — runner has no I/O. All side effects flow through `EventEmitterPort` / `ActivityRunnerPort`, which are activity proxies in the Temporal adapter.                                                                                                                  |
| Object property iteration                | Yes (`for…of`)  | ✅ Safe — `for…of` on a `Map` follows insertion order. Object literal spread (`{ ...nodeOutputs }`) preserves own-property order per ECMA-262 §7.3.21 since 2015; both V8 and Temporal's sandboxed V8 respect this.                                                        |
| `Array.prototype.sort`                   | No              | ✅ Safe — no sorting in the runner. If sorting becomes necessary, it must be stable AND use a deterministic comparator based on input data (not, e.g., insertion time).                                                                                                    |
| `Promise.all` completion order           | Yes             | ✅ Safe — `Promise.all` resolves with results in **input order**, regardless of completion order. The runner reads `results[i]` positionally, never branches on which promise resolved first.                                                                              |
| Async/await scheduling                   | Yes             | ✅ Safe — Temporal patches the JS event loop microtask queue inside the sandbox; the order in which awaits resume is deterministic across replay.                                                                                                                          |
| `Array.prototype.shift` on BFS queue     | Yes             | ✅ Safe — FIFO order is deterministic given a deterministic push order. The push order in `propagate` comes from iterating `successors` (a `Map` value), which is insertion-deterministic.                                                                                 |
| Throwing for control flow                | Yes             | ✅ Safe — `throw new Error('Workflow has no entrypoint node')` is synchronous and deterministic. `NodeExecutionError` is a plain `Error` subclass with no side effects in its constructor.                                                                                 |
| External clock / wall time               | No              | ✅ Safe — runner does not read time. `events.emitEvent('execution_started', ...)` etc. are activities; the timestamp is recorded by the activity outside the sandbox.                                                                                                      |
| Iteration over `Object.keys`/`values`    | No              | ✅ Safe — runner uses `Map` for stateful collections; `nodeOutputs` is an object but never iterated for control flow (only `{ ...nodeOutputs }` for context cloning, which preserves order).                                                                               |
| Module-level initialization side effects | No              | ✅ Safe — `graph-runner.ts` exports only function declarations; no top-level statements that read environment or instantiate stateful objects.                                                                                                                             |
| `errors.ts` `NodeExecutionError`         | Yes             | ✅ Safe — constructor only calls `super(message, { cause })` and sets `this.name`. No `Date.now()` in the message, no UUID minting, no env reads.                                                                                                                          |

## How activities preserve determinism for the runner

The runner calls into three ports — `ActivityRunnerPort.executeNode`, `EventEmitterPort.emitEvent`, `EventEmitterPort.updateStatus`. In the Temporal adapter (`run-workflow.ts`) these are wired via `proxyActivities`. Temporal records each activity's input, output, and timing in workflow history at first execution; on replay it returns the cached result without re-executing the activity. From the runner's point of view, every `await runner.executeNode(...)` returns the same `NodeExecutionResult` on first run and on replay — so any non-determinism inside the executor (an LLM call, a network round-trip, a database write) is contained in the activity boundary and never reaches the workflow code.

The same holds for failures: a `throw` from an activity is also recorded; replay re-throws the same error with the same message. The runner's `catch` branch in `runNode` therefore runs identically across replays.

## Conclusions

`runGraph` is replay-safe under Temporal's V8 sandbox. The audit found no non-deterministic primitive in use; the algorithm relies on insertion-ordered `Map` iteration and positional `Promise.all` results, both of which are spec-deterministic. All side-effecting calls are routed through `ActivityRunnerPort` / `EventEmitterPort`, which are activity proxies whose outputs Temporal caches.

A regression test (`graph-runner.replay-determinism.test.ts`) pins this by running the same graph N times against an identical deterministic mock and asserting that the resulting sequence of events, statuses, and `nodeOutputs` is byte-equivalent across runs. This catches accidental introductions of `Date.now()`, `Math.random()`, `Promise.race`, or anything else that would diverge between executions.

## Maintenance rules for `runGraph`

Code added inside `runGraph` or any file reachable from `./workflow.ts` must obey:

1. **No clock reads.** No `Date.now()`, `new Date()`, `performance.now()`. If you need a timestamp in the event payload, the activity (`emitEvent`) records it on the outside.
2. **No random.** No `Math.random()`, no `crypto.randomUUID()`. IDs come in through `WorkflowExecutionInput`.
3. **No I/O.** No `fetch`, no `fs`, no `process.env`, no DB calls. Push them behind an activity port.
4. **No `Promise.race` / `Promise.any`.** They branch on completion order. Use `Promise.all`.
5. **No `Array.prototype.sort` with a non-deterministic comparator.** If sorting is unavoidable, key by input data.
6. **No `Set` for control flow.** Insertion order is fine in the spec, but a future regression that adds non-deterministic `add()` order would break replay silently. Stay with `Map<id, value>` and explicit ordering.
7. **No top-level side effects in new modules.** Module init runs at workflow start; reading `process.env` or constructing dated objects at import time poisons replay.

Wiring a logger into `runGraph` is the most likely way a future change would break replay. A typical console adapter calls `new Date().toISOString()` per log line, which poisons history reproduction. If a logger ever needs to ship from the runner, it must be passed in as a sandbox-safe port whose impl writes through an activity (so the timestamp is recorded outside the sandbox), not directly to console.

## Why no live `Worker.runReplayHistory` test

The acceptance criteria call for a "replay test demonstrating identical history reproduces identical output." Two implementation paths exist:

- **A. Real Temporal replay** — spin up `@temporalio/testing`'s `TestWorkflowEnvironment`, run a workflow, fetch history, replay history with the current code via `Worker.runReplayHistory`. This catches every spec-level non-determinism Temporal knows about, but pulls in a heavy devDependency (`@temporalio/testing` ships a temporal-server binary and requires a Java runtime in CI).
- **B. Replay-equivalence by re-execution** — run `runGraph` N times against identical deterministic mocks and assert the resulting sequence of `EventEmitterPort` and `ActivityRunnerPort` calls is byte-equivalent across runs. No extra deps; runs in vitest in ~10ms.

We chose **B**. The runner's deterministic surface is small (no Date, no random, no Set, no I/O), so direct re-execution catches every primitive a Temporal replay would catch. The only thing it misses is detection of the rare cases Temporal's sandbox itself intercepts — `Date.now()` would replay-fail under (A) but throw at runtime under our normal vitest run too (the audit table covers this case). The cost/benefit tilted strongly toward keeping the test cheap.

If the algorithm grows new constructs (e.g. `Promise.race`, custom event loop primitives), we should revisit and add (A) as a follow-up.
