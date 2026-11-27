---
'@workflowbuilder/sdk': major
---

`date`, `datetime` and the new `time` values picked in the editor are stored as zone-less wall time, `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm` and `HH:mm`, and mean that day and clock for every viewer. Values from outside carry a zone and are instants; the worker reads a set value in the workflow zone, UTC for now, when it compares the two. A bare time that arrives with a zone is compared as the clock written in it, without conversion. 3.0.0 stored UTC instants written by `toISOString()`.

Node schemas declare these properties as `type: 'date'`, `type: 'datetime'` or `type: 'time'`, also inside nested objects; the SDK validates them itself. Replace `type: 'string', format: 'date'` / `format: 'time'` on picker-bound properties.

Breaking changes:

- Values saved by 3.0.0 (the `y` of a `DynamicConditions` / `DecisionBranches` condition row and the `defaultValue` of a `date` / `datetime` global variable) are not converted: the editor reads the clock written in the string and drops the offset, so each shows off by its author's UTC offset. On load it logs one `console.warn` naming the locations, ending with `(migration: zone-less-date-time)`. Re-pick the values in the editor or convert the stored JSON once in the zone they were picked in; see the [4.0 upgrade guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/#date-and-time-values).
- Code that read these values with `new Date(value)` now parses a zone-less string as local time; read the stored shape instead of treating it as an instant.
