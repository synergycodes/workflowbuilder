### Title: Decision branch with no conditions is the explicit catch-all

### Proposed by: Jan Librowski

### Date: 10.06.2026

## Context

End-to-end verification of the WB-229 demo deployment failed on the
reference workload: the Sales Inquiry Pipeline's classifier returned
`**Type:** general`, no conditional branch matched, and the run ended in
`execution_failed` — despite the template shipping a 'General' branch with
`conditions: []` as its designed fallback.

The codebase contradicted itself on what a catch-all is:

- `decision-no-match.decision-log.md` (execution-core, 29.04.2026) decided
  **strict fail-fast on no match** — correct and kept — but its Cons section
  declared an empty-conditions branch non-matching, requiring a
  tautological condition (`x === x`) as the catch-all idiom. A unit test
  pinned that.
- The executor's own `no_branch_matched` error message instructed the
  opposite: _"Add an explicit catch-all branch with no conditions."_
- The reference template (`sales-inquiry-flow.ts`) followed the error
  message, not the test — and was broken for any input classified outside
  its keyword branches. Local demos always matched 'pricing'/'technical', so
  this never surfaced until a different model classified an input as
  'general'.

Three artifacts said "empty = catch-all", one said the opposite; the
user-facing ones (error message, reference template) all pointed one way.

## Decision

`branchMatches` in `apps/execution-worker/src/executors/decision.ts` now
returns `true` for an empty `conditions[]`. First-match order is preserved,
so a catch-all only fires when placed after the conditional branches. The
strict throw from the original decision is untouched: a decision node whose
branches all have conditions and none match still fails with
`no_branch_matched`.

This supersedes the "empty conditions are non-matching" bullet (and the
test pinning it) from `decision-no-match.decision-log.md`. The fail-fast
core of that decision stands.

## Alternative Options Considered

- **Keep the semantics, fix the template with a tautological condition** —
  rejected: every UI author following the error message's instruction would
  keep hitting the same failure, and `isEqual 'a' 'a'` as the blessed
  catch-all idiom is noise a property panel can't explain.
- **`isDefault: true` flag on a designated branch** — still the cleaner
  long-term UX (already noted in the original log); still deferred for the
  same reason: type + Zod schema + properties-panel changes, separate
  ticket.

## Consequences

- **Pros**
  - The shipped reference template and the executor's error message are now
    both true.
  - Catch-all is expressible in the UI as-is (an empty branch), no magic
    conditions.
- **Cons**
  - Semantics change: a flow that contained an empty-conditions branch and
    relied on the node failing now routes through that branch. No known
    flow does this — the only shipped example wanted the opposite.
  - A _misplaced_ empty branch (before conditional ones) silently wins due
    to first-match order; the matched branch is visible in the
    `matchedBranch` output and event log.

## Status

Accepted
