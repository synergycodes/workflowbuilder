# Replay histories

Event Histories recorded from real runs, replayed against the current workflow code so
a change that would break a run already in flight fails in CI instead of in production.
A workflow can wait for days, so this is the guard that lets the package be edited
between releases at all.

`replay.test.ts` is the harness. It starts a real Temporal (an in-memory dev server via
`@temporalio/testing`), runs every scenario in `../fixtures/replay-scenarios.ts`, and then
does four separate things. The first three read what came back from that run. The fourth
runs every scenario a second time under a different worker configuration, so the file
performs two live executions per scenario:

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
4. **Runs every scenario again with the workflow cache off** (`maxCachedWorkflows: 0`), so
   every workflow task replays from the first event instead of resuming, and re-checks
   the counts from (1) and what the store received. No sticky queue is used at all in
   this mode, so a side effect that runs on replay shows up as an extra activity or write.

(3) is the only check that can catch a break against code that is already deployed, because
it is the only one comparing the current code to a recording it did not make. (2) cannot:
the history it replays was recorded by the same code moments earlier.

(4) is not in that bucket. It re-runs the scenario live and checks two of its four
assertions against hand-written fixture expectations, and it is the only check that
exercises the uncached path at all. What it cannot see is a cross-version break, since it
only ever runs the current code.

## The scenarios

One file per path through the sandbox code. A change that leaves one path alone can still
move the commands on another, so every scenario replays on every run.

| File                               | Graph                            | Path it protects                                                                                                                                                        |
| ---------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<version>-parallel-wave.json`     | `start → (left, right) → join`   | The happy path. A fan-out is the only shape that puts two commands in a single workflow task, where the runner's `Promise.all` becomes visible to Temporal.             |
| `<version>-fail-policy.json`       | `start → (fail, sibling) → join` | A node failing under the default `fail` policy: the wave still finishes, the join is never reached, `execution_failed` closes the run and the Workflow Execution fails. |
| `<version>-incomplete-branch.json` | `start → route ─[yes]→ taken`    | `route` names a port with no edge: `taken` is skipped as `branch_not_taken`, the run closes `incomplete` and the Workflow Execution completes.                          |
| `<version>-cancel-mid-run.json`    | `start → block`                  | A cancel while `block` is in flight: the non-cancellable cleanup emits `execution_cancelled` and the Workflow Execution closes as Canceled.                             |

The cancel scenario parks its executor until the driver has cancelled the run, so the
recording always catches the activity open. The late completion then meets a closed run,
which Temporal core logs as one "Activity not found on completion" warning. A green run
also logs "Activity failed" and "Workflow failed" from the fail-policy scenario, which
fails a node on purpose. All three are expected; nothing is wrong with a run that has them.

## Recording a history

From the harness, which is what the committed files come from. Name the scenario so the
others keep guarding what they recorded:

```bash
UPDATE_REPLAY_HISTORIES=<scenario>[,<scenario>] pnpm --filter @workflowbuilder/temporal test
```

`UPDATE_REPLAY_HISTORIES=1` re-records every scenario; see rule 3 before reaching for it.
Adding a scenario means adding an entry to `../fixtures/replay-scenarios.ts`, recording
it by name, and describing it in the table above. The harness fails until the file exists.
Recordings land under the `v0-` prefix unless `REPLAY_HISTORY_VERSION` says otherwise;
the last section covers when to set it. An existing file is never overwritten: the harness
fails and names it, so a release recorded without the version variable does not rewrite
the previous set. `REPLAY_HISTORY_OVERWRITE=1` is the explicit way to re-baseline.

Or from a real run against a local stack, for a scenario the harness cannot stage.
`historyToJSON` writes the same shape, so the two are interchangeable. Read the whole output
before committing it. The first event carries the `WorkflowExecutionInput`, including the
`variables` and `global` bags, and a recording from a real run also carries every `executeNode`
argument set and result, every node's `config`, and the text of every error. All of it is
recorded verbatim. The harness recordings carry only empty bags and a synthetic graph.

```bash
temporal workflow show --workflow-id execution-<id> --output json > histories/<version>-<scenario>.json
```

## Rules once files live here

1. A failing replay means today's code would issue commands the recorded run never made.
   What to do about it depends on whether the package has shipped; see the next section.
2. Do not edit or delete a history while runs recorded by that version may still exist.
   New behaviour gets a new file next to the old ones.
3. Regenerating a file resets what it guards. Rewriting a history from current code turns
   the cross-version check into a self-check, which is why the harness refuses to overwrite
   without `REPLAY_HISTORY_OVERWRITE=1`. Record by scenario name when adding one; `=1` with
   the overwrite flag is for a deliberate re-baseline of every scenario, never for making a
   red test green.

`v0-` was the pre-release baseline, recorded before the package published its first
version; those files went with the 0.1.0 release, so a recording that lands under `v0-`
today means the version variable was forgotten. Every release records every scenario again
under the version it ships, in the release PR right after `pnpm release:version temporal`:

```bash
REPLAY_HISTORY_VERSION=<version> UPDATE_REPLAY_HISTORIES=1 pnpm --filter @workflowbuilder/temporal test
pnpm --filter @workflowbuilder/temporal test
```

The first run writes `<version>-<scenario>.json` next to the earlier files and leaves them
untouched; the second replays everything, old sets included. Each release adds its own set
this way, and rule 2 keeps the earlier ones where they are.

## What a red cross-version test means

**Before the first release**: no published version and no consumer outside this repo. No run recorded by an older build
exists anywhere, so nothing is stranded and no deploy is at risk. Red means one thing,
and it is a design signal rather than an incident: a command reached a path that was
supposed to be left alone. Read the change first. If the new command genuinely belongs
on that path, re-record the history (`REPLAY_HISTORY_OVERWRITE=1`, since the file exists) and
say so in the commit message. `patched()` is not needed and no major is due.

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
