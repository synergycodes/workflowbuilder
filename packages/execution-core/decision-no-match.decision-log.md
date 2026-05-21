### Title: Decision executor fails fast on no matching branch

### Proposed by: Kuba Skibiński

### Date: 29.04.2026

## Context

The decision executor at `packages/execution-core/src/executors/decision.ts:21–29` was routing execution down `decisionBranches[0]` whenever no branch's conditions matched — silently. No log, no error event, no `node_failed`. The `matchedBranch` in the output reflected the silent fallback, so an event-log audit looked identical to a successful match.

Users misconfigure decisions constantly: wrong operator, wrong field name, type mismatch (`'5' < '10'` is `false` because the comparison is string-based, etc.). The silent fallback hid every misconfig as "decision matched the first branch" and routed execution down a path the user never intended. Debugging required reading the conditions by hand against runtime values.

Two product-decision options were on the table:

- **Strict** — no match → throw → `node_failed` with `code: 'no_branch_matched'`. Users author an explicit catch-all branch.
- **Explicit default** — require `isDefault: true` on a designated branch. No default → runtime error. Default → run that branch (with a flag distinguishing match vs default).

User chose **Strict** for this PR.

## Decision

Three changes in `packages/execution-core`:

1. **`decision.ts` throws** `NodeExecutionError('no_branch_matched', ...)` instead of falling through to `branches[0]`.
2. A new **`NodeExecutionError`** class in `packages/execution-core/src/errors.ts` — an `Error` subclass carrying a `code: string` field. Plain `Error` continues to work; only `NodeExecutionError` opts in to structured-code propagation.
3. **`graph-runner.ts` `runNode` catch** propagates `error.code` into the `node_failed` event payload. The `ExecutionErrorPayload['error'].code` field already existed in `packages/types/src/workflow-execution/execution-events.ts` — this just fills it in.

Six tests (4 unit + 2 integration) lock down the contract:

- `decision.test.ts`: returns first matching branch / skips non-matching to find next match / throws `NodeExecutionError` with code when nothing matches / treats empty-conditions branch as non-matching (so authors must use explicit operators for catch-all).
- `graph-runner.test.ts` (appended): `NodeExecutionError` thrown by an executor → `node_failed` payload includes `code` / plain `Error` keeps the current message-only shape (no regression for existing consumers).

## Alternative Options Considered

- **Keep silent fallback** — rejected, the bug.
- **Explicit `isDefault: true` flag on a designated branch** — rejected for this PR: requires a `DecisionBranch` type change in `packages/types`, a Zod schema update in `apps/backend/src/domain/mapper/snapshot-schema.ts`, and frontend property-panel UI to expose the checkbox. Bigger scope, separate UX ticket on the follow-up list.
- **Throw plain `Error` without `code`** — rejected. Adding a small `NodeExecutionError` class costs ~10 lines and gives executors a structured error-code channel for free. Reusable for future executors (`'llm_timeout'`, `'template_unresolved'`, etc.) without further wiring.
- **Add `isDefault` _and_ keep the silent fallback as a transition tool** — rejected. Two semantics for the same concept is confusing; users couldn't tell which case they were in. Strict is the unambiguous answer.

## Consequences

- **Pros**
  - Misconfigured decisions surface immediately as `node_failed` (with precise `code` and human-readable `message`) and `execution_failed`. No more silent wrong routing — the event log tells the whole story.
  - The `NodeExecutionError` + `runNode` plumbing is reusable infrastructure: any executor can now throw with a structured code and have it land in the SSE stream verbatim.
  - The fix is symmetric on the topological scheduler — a `node_failed` decision short-circuits the wave with the same semantics as any other failure.
  - Decision unit tests (4) and integration tests (2) prevent regression of both the no-match throw and the code-propagation wiring.

- **Cons**
  - Existing flows that relied on the silent fallback (intentionally or by accident) will now fail loudly. For local-dev OSS-readiness deploy this is acceptable — the failure is the right outcome and the data is throwaway. Users who _want_ a default need an explicit catch-all branch.
  - A branch with empty `conditions[]` no longer "matches by default" (it never did at runtime, but the silent fallback masked this). A catch-all must use a tautologically true condition like `{x: 'a', y: 'a', comparisonOperator: 'isEqual'}`. Reasonable; documented in the test.

## Status

Accepted
