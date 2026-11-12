---
'@workflowbuilder/sdk': major
---

`date` and `datetime` values picked in the editor are stored as zone-less wall time, `YYYY-MM-DD` and `YYYY-MM-DDTHH:mm`, and mean that day and clock for every viewer and for the worker; the new `time` type is stored as `HH:mm:00+00:00`, where the offset is nominal. 3.0.0 stored UTC instants written by `toISOString()`.

Breaking changes:

- Values saved by 3.0.0 (the `y` of a `DynamicConditions` / `DecisionBranches` condition row and the `defaultValue` of a `date` / `datetime` global variable) are not converted: the editor reads the clock written in the string and drops the offset, so each shows off by its author's UTC offset. On load it logs one `console.warn` naming the locations, ending with `(migration: zone-less-date-time)`. Re-pick the values in the editor or convert the stored JSON once in the zone they were picked in; see the [4.0 upgrade guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/#date-and-time-values).
- Code that read these values with `new Date(value)` now parses a zone-less string as local time; read the stored shape instead of treating it as an instant.
