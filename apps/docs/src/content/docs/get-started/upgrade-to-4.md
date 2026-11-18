---
title: Upgrade to 4.0
description: What changed between @workflowbuilder/sdk 3.0.0 and 4.0.0, and how to migrate an editor and the workflows it saved.
sidebar:
  order: 7
---

Version 4.0 settles the public API on one vocabulary and replaces the 3.x extension slots
with `builtInControls`, the `…Content` and `…MenuItem` components and the
`useWorkflowBuilderState()` / `useWorkflowBuilderActions()` hooks. Those are code changes:
TypeScript reports a renamed export, and the editor logs a `console.warn` naming the
replacement when it meets a removed slot or prop. The
[4.0 changelog](https://github.com/synergycodes/workflowbuilder/blob/main/packages/sdk/CHANGELOG.md)
lists every one of them with its replacement.

One change reaches saved workflows rather than code, and this page walks through it.

## Date and time values

A `date` or `datetime` picked in the editor is stored as zone-less wall time: the day and
clock as written, the same for every viewer and for the worker. 3.0.0 stored an instant
instead.

| Type       | 3.0.0 stored                                                   | 4.0 stores         |
| ---------- | -------------------------------------------------------------- | ------------------ |
| `date`     | `YYYY-MM-DDTHH:mm:ss.sssZ`, the author's midnight moved to UTC | `YYYY-MM-DD`       |
| `datetime` | `YYYY-MM-DDTHH:mm:ss.sssZ`, the picked clock moved to UTC      | `YYYY-MM-DDTHH:mm` |
| `time`     | not available                                                  | `HH:mm:00+00:00`   |

The `+00:00` on `time` is nominal: JSON Schema `format: 'time'` requires an offset, and the
editor never applies it. A date picker has no clock, so an instant lands on another day in
another zone; with wall time the author, every reader and the worker see the same day and
clock.

### Who is affected

Values picked in 3.0.0 sit in two places of a saved workflow:

- the right-hand value (`y`) of a condition row in a `DynamicConditions` or
  `DecisionBranches` control, for example `decisionBranches[0].conditions[1].y`;
- the `defaultValue` of a global variable of type `date` or `datetime`.

  4.0 does not convert them: it cannot know the zone they were picked in. It reads the clock
  written in the string and drops the offset, so each value shows off by its author's UTC
  offset at the time. A date picked as 15 January 2024 in Warsaw was stored as
  `2024-01-14T23:00:00.000Z` and now reads as 14 January, 23:00.

When a workflow with such values loads, the editor logs one warning naming the count, up to
three locations and the marker of this section:

```text
[@workflowbuilder/sdk] 1 date/datetime value(s) were saved by SDK 3.0 as UTC instants (YYYY-MM-DDTHH:mm:ss.sssZ). 4.0 shows the clock written in them, so each is off by its author's UTC offset: node 7c9e6679-7425-40de-944b-e07fc1f90ae7 · decisionBranches[0].conditions[1].y. Re-pick each in the editor or convert the stored data once, see https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/#date-and-time-values (migration: zone-less-date-time)
```

### What to do

- Re-pick each listed value in the editor. Saving writes the new shape, and the warning
  stops once no instant is left.
- Or convert the stored JSON once, when you know the zone the values were picked in: parse
  the instant, format it in that zone as `YYYY-MM-DD` for a `date` or `YYYY-MM-DDTHH:mm`
  for a `datetime` (`Intl.DateTimeFormat` with `timeZone`, or `date-fns-tz`), and write it
  back. The SDK ships no helper for this on purpose: only you know the zone.

A field that you move from the `DatePicker` form control to `VariableDynamic` carries the
same caveat for the values it already holds. `DatePicker` keeps writing `Date#toString()`
strings in 4.0, and the warning does not cover them.

## Where to go next

- [Upgrade to 3.0](/get-started/upgrade-to-3/) if you come from 2.3.0.
- [Use the variable picker](/guides/use-variable-picker/) for the `VariableDynamic` control
  and the variable types behind these values.
