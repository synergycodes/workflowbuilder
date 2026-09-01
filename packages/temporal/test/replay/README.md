# Replay histories

Event Histories recorded from real runs, replayed against the current workflow code so
a change that would break a run already in flight fails in CI instead of in production.
A workflow can wait for days, so this is the guard that lets the package be edited
between releases at all.

`replay.test.ts` is the harness. It starts a real Temporal (an in-memory dev server via
`@temporalio/testing`), runs a graph, and then does three separate things with what came
back:

1. **Counts the scheduled activities per type.** One `executeNode` per node, one
   `emitEvent` per emitted event, one `updateStatus` for the terminal write. An extra
   activity anywhere in `runGraph` moves one of those numbers.
2. **Replays the history it just recorded.** Same code, same history — proves the run is
   reproducible under Temporal's own replayer, not only under the re-execution harness in
   `execution-core`.
3. **Replays a committed history from `histories/`.** The cross-version guard. This is
   the one that fails when today's code would issue commands a run recorded on older code
   never made.

Only (3) survives a change to the runner, which is why (3) is the one that matters at
review time. (2) passes even on a broken change, because the history it checks was
recorded by the same broken code.

## The graph the harness runs

`start → (left, right) → join`, defined in `../fixtures/graph.ts`. The fan-out is the
point: it is the only shape that puts two commands in a single workflow task, which is
where the runner's `Promise.all` becomes visible to Temporal. A straight line replays
green while leaving that path untested.

## Recording a history

From the harness, which is what the committed files come from:

```bash
UPDATE_REPLAY_HISTORIES=1 pnpm --filter @workflowbuilder/temporal test
```

Or from a real run against a local stack, which is worth doing for a scenario the harness
cannot stage. `historyToJSON` writes the same shape, so the two are interchangeable:

```bash
temporal workflow show --workflow-id execution-<id> --output json > histories/<version>-<scenario>.json
```

Scenarios still worth adding, one file each: a cancellation mid-run, and a node failure
that goes through the error policy.

## Rules once files live here

1. A failing replay means the change breaks in-flight runs. Either guard it with
   `patched()`, or declare it a major release with a note to drain runs first.
2. Do not edit or delete a history while runs recorded by that version may still exist.
   New behaviour gets a new file next to the old ones.
3. Regenerating a file resets what it guards. `UPDATE_REPLAY_HISTORIES=1` rewrites the
   history from current code, so the cross-version check silently becomes a self-check.
   Reach for it when adding a scenario, not to make a red test green.

`v0-` names the pre-release baseline: the package has not published a version yet, so
these are histories from the code as it stood before the first release.
