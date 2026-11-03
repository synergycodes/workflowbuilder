### Title: Topological scheduling for the graph runner

### Proposed by: Kuba Skibiński

### Date: 28.04.2026

## Context

The previous graph runner in `packages/execution-core/src/graph-runner.ts` ran a BFS-style wave loop where a node was scheduled in the next wave the moment **any** of its predecessors completed. The follow-up dedup (`!nextNodes.some(...)`) prevented double-scheduling within a single wave but did **not** verify that all of a node's predecessors had finished.

Concrete failure mode: in the DAG `A → A' → C, B → C` where B is at depth 1 and A' at depth 2, B finishes in wave 1 and schedules C for wave 2. A' is _also_ at depth 2, so it runs in the same wave as C. C executes with `nodeOutputs[A']` missing. Linear and single-decision flows are unaffected; any real fan-in pattern is subtly wrong.

Decision routing complicated this further. Decision nodes set `nextPort` (the chosen branch's `sourceHandle`); the wave loop filtered outgoing edges by that handle. The filter was "late" — successors were collected and then deduped — and made it impossible to express "this entire downstream subtree should be skipped because no live edge reaches it".

The reserved `branch_spawned` / `branches_joined` event types in `packages/types/src/workflow-execution/execution-events.ts` hint this scheduling work was intended for a later iteration. They remain unemitted (frontend doesn't consume them yet); kept on the punch list as a follow-up.

`execution-core` had no test infrastructure; given that the bug is subtle and easy to regress, this PR also stands up vitest in the package and ships eleven unit tests covering linear / fan-out / diamond / asymmetric / multi-entrypoint / decision-routing / decision-pruned-fan-in / skip-propagation / failure-short-circuit / no-entrypoint / cycle scenarios.

## Decision

Replace the BFS wave loop with predecessor-counter scheduling:

- `pendingPredecessors[nodeId]` — count of incoming edges not yet resolved (either the predecessor completed, or its decision pruned the edge).
- `liveIncoming[nodeId]` — count of incoming edges that resolved via a non-pruned route.
- `status[nodeId]` ∈ `{ 'pending', 'completed', 'skipped' }`.

When a node completes (with optional `nextPort` from a decision):

1. For each outgoing edge `(sourceHandle, target)`:
   - Decrement `pendingPredecessors[target]` (always — the edge is resolved either way).
   - If `!nextPort || sourceHandle === nextPort` → also increment `liveIncoming[target]`.
2. When `pendingPredecessors[target]` reaches 0:
   - If `liveIncoming[target] > 0` → schedule for the next wave.
   - Else → mark as `'skipped'` and recurse with `sourceLive = false`, so the skip propagates through `target`'s outgoing edges and any unreachable subtree resolves cleanly.

Per-wave parallelism preserved: each iteration runs all currently-ready nodes via `Promise.all`. Failure short-circuit preserved: any failure in a wave aborts the graph and emits `execution_failed`. Empty entrypoint set still throws `'Workflow has no entrypoint node'`.

Skip propagation runs as an iterative breadth-first walk over a small queue rather than direct recursion, so pathological dead-branch chains can't blow the call stack.

After the wave loop exits, a stall check inspects `pendingPredecessors`: any node still `'pending'` with a non-zero counter never became reachable. The graph emits `execution_failed` with a message listing the stalled node IDs and `updateStatus('failed', ...)` instead of `execution_completed`. This catches reachable cycles (`B → C → B`), dangling-target edges that sit in `pendingPredecessors` but never resolve, and any future scheduling regression that leaves nodes hanging — all of which would otherwise produce a "successful" completion event with parts of the workflow never run.

Vitest infra introduced in `packages/execution-core/`: `vitest.config.mts` with `environment: 'node'`, `test`/`test:watch` scripts in `package.json`, root `pnpm test` updated to run both SDK and execution-core suites.

## Alternative Options Considered

- **Kahn's algorithm with priority queue** — rejected. Equivalent semantics for a DAG, more machinery, no runtime advantage when nodes within a wave run concurrently anyway.
- **Per-completion (event-driven) scheduling instead of wave-batched** — rejected. Cleaner conceptually for true concurrent ready-set growth, but harder to test deterministically and changes the timing of `Promise.all`-driven event ordering. Wave-batched matches existing semantics one-to-one.
- **Defer the fix; bundle cycle detection** — rejected. Cycles deadlock silently today; the scheduling fix is independent and worth landing on its own. Full cycle detection (proactive, before execution starts) belongs to a separate hardening pass — but a cheap post-loop stall check (see Decision below) catches cycles reachable from an entrypoint as a side effect, so we don't ship a known silent-completion regression alongside the fix.
- **Emit `node_skipped` event for decision-pruned nodes** — rejected for this PR. Frontend doesn't consume yet; surfacing it would be a UX feature, separate ticket.
- **Manual smoke testing only (consistent with I-01)** — rejected. The bug is scheduler-level and easy to regress unobserved. The bug-report itself estimates _"M (2-3 days **including tests**)"_. Test infra was always part of scope.

## Consequences

- **Pros**
  - Fan-in semantics correct: a join point sees outputs from all of its live predecessors, in the wave **after** all of them have finished.
  - Decision-pruned branches genuinely skipped at scheduling time — pruned subtrees never enter the ready set, never emit `node_started`. Skip propagates transitively (`E ← C ← Cprime`, when `C` is in the dead branch, `Cprime` and `E` resolve correctly).
  - The `(!result.nextPort || result.nextPort === sourceHandle)` filter logic is unchanged — same edge-liveness predicate, just applied in a different place. No semantic drift on existing flows.
  - Test infra now exists in `execution-core`. Future graph-runner / executor / template-resolution work has a place to land tests.

- **Cons**
  - More state to track per node — `O(nodes)` extra memory on top of the existing adjacency map. Not material at expected workflow sizes.
  - The stall check is reactive (post-loop) rather than proactive (before execution starts). Workflows containing reachable cycles still execute their non-cycle prefix before failing. Proactive cycle detection is a future ticket; the reactive check is enough to keep `execution_completed` honest.

## Status

Accepted
