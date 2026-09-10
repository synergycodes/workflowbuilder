# Replay histories

Event Histories recorded from real runs, replayed against the current workflow code so
a change that would break a run already in flight fails in CI instead of in production.
A workflow can wait for days, so this is the guard that lets the package be edited
between releases at all.

`replay.test.ts` is the harness. It starts a real Temporal (an in-memory dev server via
`@temporalio/testing`), runs every scenario in `../fixtures/replay-scenarios.ts`, and then
does three separate things with what came back:

1. **Counts the scheduled activities per type.** One `executeNode` per node that ran, one
   `emitEvent` per emitted event, one `updateStatus` for the terminal write. An extra
   activity anywhere in `runGraph` moves one of those numbers.
2. **Replays the history it just recorded.** Same code, same history — proves the run is
   reproducible under Temporal's own replayer, not only under the re-execution harness in
   `execution-core`.
3. **Replays every committed history in `histories/`.** The cross-version guard. This is
   the one that fails when today's code would issue commands a run recorded on older code
   never made. It goes through `Worker.runReplayHistories`, so one broken history reports
   alongside the others instead of hiding them. It also insists that every scenario has a
   recording and every recording belongs to a scenario; the version prefix is free.

Only (3) survives a change to the runner, which is why (3) is the one that matters at
review time. (2) passes even on a broken change, because the history it checks was
recorded by the same broken code.

## The scenarios

One file per path through the sandbox code. A change that leaves one path alone can still
move the commands on another, so all four replay on every run.

| File                        | Graph                            | Path it protects                                                                                                                                                        |
| --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v0-parallel-wave.json`     | `start → (left, right) → join`   | The happy path. A fan-out is the only shape that puts two commands in a single workflow task, where the runner's `Promise.all` becomes visible to Temporal.             |
| `v0-fail-policy.json`       | `start → (fail, sibling) → join` | A node failing under the default `fail` policy: the wave still finishes, the join is never reached, `execution_failed` closes the run and the Workflow Execution fails. |
| `v0-incomplete-branch.json` | `start → route ─[yes]→ taken`    | `route` names a port with no edge: `taken` is skipped as `branch_not_taken`, the run closes `incomplete` and the Workflow Execution completes.                          |
| `v0-cancel-mid-run.json`    | `start → block`                  | A cancel while `block` is in flight: the non-cancellable cleanup emits `execution_cancelled` and the Workflow Execution closes as Canceled.                             |

The cancel scenario parks its executor until the driver has cancelled the run, so the
recording always catches the activity open. The late completion then meets a closed run,
which Temporal core logs as one "Activity not found on completion" warning. Expected.

## Recording a history

From the harness, which is what the committed files come from. Name the scenario so the
others keep guarding what they recorded:

```bash
UPDATE_REPLAY_HISTORIES=<scenario> pnpm --filter @workflowbuilder/temporal test
```

`UPDATE_REPLAY_HISTORIES=1` re-records every scenario; see rule 3 before reaching for it.
Adding a scenario means adding an entry to `../fixtures/replay-scenarios.ts`, recording
it by name, and describing it in the table above. The harness fails until the file exists.

Or from a real run against a local stack, for a scenario the harness cannot stage.
`historyToJSON` writes the same shape, so the two are interchangeable. Read the output
before committing it: the first event carries the whole `WorkflowExecutionInput`,
including the `variables` and `global` bags, which is where the backend injects secrets.
The harness recordings carry only empty bags and a synthetic graph.

```bash
temporal workflow show --workflow-id execution-<id> --output json > histories/<version>-<scenario>.json
```

## Rules once files live here

1. A failing replay means today's code would issue commands the recorded run never made.
   What to do about it depends on whether the package has shipped; see the next section.
2. Do not edit or delete a history while runs recorded by that version may still exist.
   New behaviour gets a new file next to the old ones.
3. Regenerating a file resets what it guards. `UPDATE_REPLAY_HISTORIES` rewrites the
   history from current code, so the cross-version check silently becomes a self-check.
   Record by scenario name when adding one; `=1` is for a deliberate re-baseline of all
   four, never for making a red test green.

`v0-` names the pre-release baseline: the package has not published a version yet, so
these are histories from the code as it stood before the first release. At that release,
record the same scenarios as `<version>-<scenario>.json` next to these. The `v0-` files
can then go, since no run outside this repo was ever recorded by pre-release code.

## What a red cross-version test means

**Before the first release**, which is where the package is today: `private: true`, no
published version, no consumer outside this repo. No run recorded by an older build
exists anywhere, so nothing is stranded and no deploy is at risk. Red means one thing,
and it is a design signal rather than an incident: a command reached a path that was
supposed to be left alone. Read the change first. If the new command genuinely belongs
on that path, re-record the history and say so in the commit message. `patched()` is not
needed and no major is due.

**After the first release**, the same red is a compatibility break with runs that may be
sitting in someone's Event History for days. Guard the change with `patched()`, or
declare a major with a note to drain in-flight runs first. Do not re-record: that throws
away the only evidence of what the published version actually did.

### Reading the change

Only some things move the command sequence, so the triage is quick.

Adds a command, and will turn the test red:

- a new `emitEvent` / `executeNode` / `updateStatus` call, or an existing one moved or removed
- a timer, including `sleep` and a `condition` given a timeout
- anything above reached on a path an older run also took

Adds nothing, and leaves the test green:

- registering a signal, query or update handler (`setHandler`) — workflow-local state, never written to history
- a `condition()` that is awaited without a deadline, or never reached at all
- changing only the _arguments_ of an existing emit

Both halves are verified, not assumed: a stand-in for the durable-pause seam (an update
handler registered unconditionally, plus an unreached `condition()`) replays the
committed history green, while one extra `emitEvent` in `runGraph` fails it with a
`DeterminismViolationError`.
