# Durable pause (HITL seam) — decision log

Context: a node executor can return `{ waiting: true }`; the graph runner parks that
wave slot on `ActivityRunnerPort.awaitResolution` and resumes with the completion the
verdict carries. This file records the decisions behind the Temporal side of the seam
(`run-workflow.ts`), so the code stays comment-light.

- **Workflow Update, not a signal.** A signal is fire-and-forget: a verdict delivered
  after a deadline auto-reject would get a 202 and vanish silently. An Update answers
  synchronously, so a late caller hears "already closed". It also lets the follow-ups
  (the decision endpoint's conflict answer, the verdict-vs-deadline race, the claim)
  sequence inside the workflow instead of keeping Postgres and Temporal consistent
  with no transaction between them.
- **Handler and state live inside the workflow function, not the factory closure.**
  `createRunWorkflow` runs once per module evaluation and returns one function. Per-run
  state beside the port would appear to work only because the sandbox re-evaluates the
  module per activation — an implementation detail, not a contract.
- **One wait-state map per node: idle (absent) → waiting → resolved.** The map is the wake-up
  condition for `condition()`, the validator's source of truth, and the
  first-write-wins record. A `resolved` entry never leaves: deleting it on consumption
  would let a second verdict in, so a duplicate is rejected synchronously with
  `verdict_already_delivered`. A `waiting` entry is removed when the wait rejects
  (cancellation), so a verdict arriving then gets `node_not_waiting`, not a false
  success. A node is scheduled at most once per run; if re-runnable nodes ever appear,
  key the map by attempt, deliberately.
- **Registering the handler unconditionally is additive.** Handler registration writes
  nothing to Event History, and a `condition()` awaited without a deadline creates no
  timer command. The committed gateless history in `test/replay/` pins this.
- **The `ReturnType<typeof defineUpdate<…>>` annotation.** `defineUpdate`'s return type
  (`UpdateDefinition`) lives in `@temporalio/common`, which this package does not
  declare as a dependency. Naming it in the emitted d.ts (TS2742) would break consumers
  under pnpm's strict layout. Anchoring the annotation to `defineUpdate` keeps the
  declaration inside `@temporalio/workflow`, which is declared. The alternative was
  adding `@temporalio/common` to `dependencies`.
- **The update validator guards engine integrity; domain validation stays out.** A
  non-`TemporalFailure` thrown from an update handler fails the workflow task, which
  retries and redelivers forever: one malformed verdict would wedge a parked run. A
  validator throw runs before acceptance instead — the update is rejected, the task is
  safe, nothing reaches history, and replay skips validators. Three invariants only:
  the update cannot kill the run, success means it landed on a waiting node, a verdict
  cannot do what an executor could not. Verdict meaning and authorship stay with the
  decision-endpoint and claim work.
- **The wait is registered before it is announced.** `parkUntilResolved` calls
  `awaitResolution` first, then emits `node_waiting` and writes the status. Both are
  activities, so a verdict sent on seeing either can never be ahead of the state the
  validator reads: `node_not_waiting` is a final answer, not a race to retry.
  Registration is state, not a command, so the committed parked history replays
  unchanged. The registered promise carries a no-op `catch`: abandoned when the
  announcement throws, its rejection on cancellation would otherwise fail the workflow
  task.
- **Known gap, accepted.** A `node_waiting` emit that fails after every retry leaves the
  `waiting` entry registered while the node fails through `errorPolicy`; a blind verdict
  for it would be accepted with no effect. A real outage fails the `node_failed` emit too
  and ends the run, so the gap needs the database to recover between two consecutive
  emits.
- **The client answers with results, not throws.** `resolveNode` addresses the update by
  name, bounds the RPC (`resolveTimeoutMs`), and maps the SDK's errors to `{ error: { code } }`
  with the codes declared once in the core's port; an unknown type is rethrown as a bug.
- **Names.** Update `resolveNode`, input `{ nodeId, resolution }`. The verdict content
  is opaque here: `resolution` is a `CompletedNodeExecution` passed to the parked node
  untouched. Giving it a domain shape belongs to the decision-contract work.
