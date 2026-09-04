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
- **The resolutions map keeps entries forever; that is the first-write-wins.** The map
  is both the wake-up condition for `condition()` and the record of delivered verdicts:
  a second Update for the same node is rejected synchronously with
  `verdict_already_delivered`. Entries are not deleted on consumption. A node is
  scheduled at most once per run, and deleting the entry would let a second verdict
  in. If re-runnable nodes ever appear, key the map by attempt, deliberately.
- **Registering the handler unconditionally is additive.** Handler registration writes
  nothing to Event History, and a `condition()` awaited without a deadline creates no
  timer command. The committed gateless history in `test/replay/` pins this.
- **The `ReturnType<typeof defineUpdate<…>>` annotation.** `defineUpdate`'s return type
  (`UpdateDefinition`) lives in `@temporalio/common`, which this package does not
  declare as a dependency. Naming it in the emitted d.ts (TS2742) would break consumers
  under pnpm's strict layout. Anchoring the annotation to `defineUpdate` keeps the
  declaration inside `@temporalio/workflow`, which is declared. The alternative was
  adding `@temporalio/common` to `dependencies`.
- **Names.** Update `resolveNode`, input `{ nodeId, resolution }`, rejection code
  `verdict_already_delivered`. The verdict content is opaque here: `resolution` is a
  `CompletedNodeExecution` passed to the parked node untouched. Giving it a domain
  shape belongs to the decision-contract work; validating it belongs to the decision
  endpoint.
