# Replay histories

Event Histories recorded from real runs, replayed against the current workflow code so
a change that would break a run already in flight fails in CI instead of in production.
A workflow can wait for days, so this is the guard that lets the package be edited
between releases at all.

The harness is added together with the first histories. To record one:

```bash
# after running a flow end to end against a local Temporal
temporal workflow show --workflow-id execution-<id> --output json > <version>-<scenario>.json
```

Scenarios worth having, one file each: a happy path, a cancellation mid-run, and a node
failure that goes through the error policy.

Rules once files live here:

1. A failing replay means the change breaks in-flight runs. Either guard it with
   `patched()`, or declare it a major release with a note to drain runs first.
2. Do not edit or delete a history while runs recorded by that version may still exist.
   New behaviour gets a new file next to the old ones.
