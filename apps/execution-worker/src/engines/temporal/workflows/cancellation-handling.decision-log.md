### Title: Workflow cancellation handling in Temporal engine

### Proposed by: Kuba Skibiński

### Date: 27.04.2026

## Context

The DELETE `/executions/:id` endpoint in `apps/backend/src/routes/executions.ts` sets execution status to `'cancelling'` and calls `engine.cancel(executionId)`, which triggers Temporal's `handle.cancel()`. Temporal then injects a `CancelledFailure` into the running workflow at the next activity boundary.

The original `runWorkflow` simply delegated to `runGraph(...)` with no error handling. As a result, when Temporal raised `CancelledFailure`:

- `runGraph` never reached its `execution_completed` / `execution_failed` paths.
- No `execution_cancelled` event was emitted.
- `updateStatus('cancelled')` was never called.
- Postgres `executions.status` stayed at `'cancelling'` forever; `finished_at` remained NULL.
- The SSE stream in the backend never observed a terminal event type and stopped emitting anything but heartbeats — the frontend never saw a terminal state.

`runGraph` itself lives in `@workflow-builder/execution-core` and is intentionally engine-agnostic (no Temporal imports), so the cancellation translation must happen in the Temporal-specific adapter layer.

## Decision

Wrap the `runGraph(...)` call in `runWorkflow` with a `try/catch` that:

1. Detects Temporal cancellation via `isCancellation(err)` from `@temporalio/workflow`.
2. Runs cleanup inside `CancellationScope.nonCancellable(...)`. The workflow's root scope is already cancelled, so plain activity calls in the catch block would themselves be cancelled before reaching the worker. `nonCancellable` shields cleanup activities from cancellation propagation.
3. Inside the shielded scope, emits the `execution_cancelled` event (which is already declared in `packages/types/src/workflow-execution/execution-events.ts` and treated as terminal by the SSE route and the frontend store) and calls `updateStatus('cancelled')`.
4. Re-throws the original error so Temporal's own workflow status correctly reflects `Cancelled` (rather than `Completed`). This matters for Temporal Web UI, audit, and replay correctness.

## Alternative Options Considered

- **Catch inside `runGraph` itself** — rejected. Would leak Temporal coupling (`isCancellation`, `CancellationScope`) into the engine-agnostic execution core. Other engines (e.g., a future in-process runner) would have to invent their own cancellation primitives that match Temporal's, or carry around a no-op shim.
- **Cooperative cancellation via periodic `cancelRequested` polling inside the graph runner** — rejected. More code, racier semantics (cancellation only checked between iterations), and it doesn't free in-flight activities any sooner than Temporal's own propagation does.
- **Add a "terminal-state guard" to `updateExecutionStatus`** so the rare `failed`-then-cancel race can't overwrite a terminal status — deferred. Belongs to a separate hardening pass on the worker DB layer; out of scope for this single-bug PR.

## Consequences

- **Pros**
  - Cancellation is now observable end-to-end: the SSE stream emits `execution_cancelled` and closes; DB status transitions to `'cancelled'` with `finished_at` populated; Temporal Web UI shows `Cancelled`.
  - No changes outside the Temporal worker — the event type, terminal-status set, SSE handler, and frontend store mapping were all already in place.
  - Engine-agnostic core (`execution-core`) stays free of Temporal imports.

- **Cons**
  - Narrow race window: if `runGraph` has already emitted `execution_failed` and is mid-`updateStatus('failed')` activity when the cancel arrives, the workflow's await throws `CancelledFailure`, our cleanup runs, and `updateExecutionStatus` overwrites `'failed'` → `'cancelled'`. Acceptable trade-off; mitigation deferred to a future PR that adds a terminal-state guard at the DB layer.
  - No automated regression test in this PR — `apps/execution-worker` has no test infrastructure today, and standing one up (`@temporalio/testing` + vitest) is a separate scope decision. Verified via the manual smoke test documented in the PR description.

## Status

Accepted
