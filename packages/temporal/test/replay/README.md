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

## The graphs the harnesses run

`replay.test.ts`: `start → (left, right) → join`, defined in `../fixtures/graph.ts`. The
fan-out is the point: it is the only shape that puts two commands in a single workflow
task, which is where the runner's `Promise.all` becomes visible to Temporal. A straight
line replays green while leaving that path untested.

`parked-gate-replay.test.ts`: `start → gate → after`, defined in
`../fixtures/pause-graph.ts`, run to completion through a real `resolveNode` update. Its
committed history (`v0-parked-gate.json`) is the durable-pause pin: it carries the
accepted update, the `node_waiting` emit, the waiting/running status activities and the
resume, so a change that moves any command on the parked path fails here even when the
gateless baseline stays green. Since a determinism break surfaces at the first divergent
command, replaying the full history also stands in for every run still parked mid-history
when a deploy lands.

## Recording a history

From the harness, which is what the committed files come from:

```bash
UPDATE_REPLAY_HISTORIES=1 pnpm --filter @workflowbuilder/temporal test
```

The flag rewrites every committed history at once. When adding one scenario, scope the
run to that harness file (`npx vitest run test/replay/<file>`) so the other baselines
keep guarding the code that recorded them.

Or from a real run against a local stack, which is worth doing for a scenario the harness
cannot stage. `historyToJSON` writes the same shape, so the two are interchangeable:

```bash
temporal workflow show --workflow-id execution-<id> --output json > histories/<version>-<scenario>.json
```

Scenarios still worth adding, one file each: a cancellation mid-run, a node failure that
goes through the error policy, and two gates parked in one wave.

## Rules once files live here

1. A failing replay means today's code would issue commands the recorded run never made.
   What to do about it depends on whether the package has shipped; see the next section.
2. Do not edit or delete a history while runs recorded by that version may still exist.
   New behaviour gets a new file next to the old ones.
3. Regenerating a file resets what it guards. `UPDATE_REPLAY_HISTORIES=1` rewrites the
   history from current code, so the cross-version check silently becomes a self-check.
   Reach for it when adding a scenario, not to make a red test green.

`v0-` names the pre-release baseline: the package has not published a version yet, so
these are histories from the code as it stood before the first release.

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
