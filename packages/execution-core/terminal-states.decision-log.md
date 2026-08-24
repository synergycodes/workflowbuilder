### Title: `incomplete` as a third terminal state, distinct from `failed` and from a stall

### Proposed by: Dawid Aksamski

### Date: 24.08.2026

## Context

A graph could route itself into nothing and report success. `executeDecision` returns `nextPort = branch.sourceHandle`; if no edge carries that handle — the edge was deleted, the branch was renamed in config while the edge kept the old handle, or the branch was never wired — every outgoing edge is pruned. The runner had nothing left to schedule, fell out of the wave loop, emitted `execution_completed`, and Temporal closed the Workflow Execution as Completed.

This is the same class of bug as the missing start node (F3), one layer down: the run looks like it worked, and the work that never happened is invisible unless you count nodes by hand. `node_skipped` (F1) made the downstream nodes visible, but reports them as `branch_not_taken` — "the decision chose elsewhere". It didn't. It chose a branch that does not exist.

Two things had to be settled: what to call the state, and how far the blast radius goes.

## Decision

A third terminal state — event `execution_incomplete`, status `'incomplete'`, and a third `RunGraphOutcome` member `{ status: 'incomplete'; deadEnds: DeadEnd[] }`.

**The rule is one sentence:** a node returned an explicit `nextPort` and no outgoing edge went live. Each occurrence is a _dead end_, recorded as `{ nodeId, port }`. A plain leaf returns no port, so it never trips.

**Named `incomplete`, not `stalled`.** The run is over, not wedged. "Stalled" implies stuck — possibly waiting, possibly resumable if unblocked — which is the opposite of a run the engine closes normally. `'incomplete'` is also the natural sibling of `'completed'` in a status union whose members all answer "where is this run". A UI badge reading "stalled" invites the user to wait it out or cancel, when there is nothing left to wait for.

Keeping the word free matters as much as picking the right one: `Workflow stalled: nodes never became ready` already existed for the cycle check, that condition genuinely _is_ a stall, and it genuinely _is_ a failure. Naming the new state `stalled` would have forced a reword and left two conditions sharing vocabulary anyway.

**Not a failure.** `run-workflow.ts` throws only on `outcome.status === 'failed'`, so `'incomplete'` falls through and Temporal closes the run as Completed. Nothing errored; what changed is the run's own status.

**`errorRoute` with no `errorRoute` edge now counts.** The runner synthesises `nextPort = 'errorRoute'`, so the general rule already covers it — excluding it would mean carving out `RESERVED_ERROR_HANDLE`. This reverses documented behaviour: the README described that shape as a usable "silent DLQ". The policy names a port; nothing wired to it is the same broken promise as a decision routing to an unconnected handle. Deliberate absorption is what `'continue'` is for, and that idiom is now what the README points at.

**A dead end does not stop the run.** Dead ends are collected run-scoped and reported once at the end, so parallel branches still deliver their work — including LLM calls already paid for — and the terminal event names every dead end rather than just the first. Aborting mid-wave would also require cancelling in-flight activities to actually stop anything.

**Failure keeps precedence.** An unhandled node failure returns through `failExecution` before the terminal check, and the stall check runs ahead of it. A run reports incomplete only where it would otherwise have reported completed.

## Alternative Options Considered

- **`execution_stalled`** — rejected on the naming argument above.
- **Fold the cycle check in** — rejected. A cycle is the scheduler unable to proceed and should stay a failure; an incomplete run finished and simply did not reach everything. Two conditions, two words.
- **Abort at the first dead end** — rejected. Discards useful work in unrelated branches, and would need activity cancellation to stop anything already in flight.
- **A per-dead-end event plus a terminal one** — rejected. Two new contract members where one does the job; the surrounding `node_completed` / `node_skipped` events already place the dead end in the timeline.
- **A new `NodeSkipReason` instead of a run-level state** — rejected. It would describe the downstream nodes accurately but leave the run itself still reporting `completed`, which is the actual bug.
- **Publish-time validation instead of a runtime state** (F7: every decision handle wired, reachability, terminal leaves) — out of scope and not a substitute: a draft can be executed before it is ever published, and handles can drift after publication.

## Consequences

- **Pros**
  - A run that did not reach everything says so, in the event stream, the DB status, and the UI.
  - The rule is one sentence with no special cases, and the `errorRoute` shape falls out of it for free.
  - `stalled` keeps exactly one meaning, so the existing cycle message needed no rewording.
  - Temporal still reports Completed, so nothing that watches for Failed Workflow Executions starts alarming on a misconfigured graph.

- **Cons**
  - Six separate places enumerate terminal states (worker `database.ts`, backend `drain-events.ts` and `routes/executions.ts`, ai-studio stream adapter, store, and controls). All six had to change together; missing one hangs an SSE stream, leaves `finished_at` null, or strands the UI mid-run. There is no single source of truth for "terminal" — worth consolidating if a fourth state ever appears.
  - The `errorRoute` reversal is a behaviour change for anyone who relied on the silent-DLQ shape. They now get `'incomplete'` where they got `'completed'`; the migration is to switch those nodes to `'continue'`.

## Status

Accepted
