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

Two changes are silent: one reaches saved workflows rather than code, and one changes
a path that TypeScript does not check. This page walks through both.

## Date and time values

A `date`, `datetime` or `time` picked in the editor is stored as zone-less wall time: the
day and clock as written, the same for every viewer. 3.0.0 stored an instant instead.

| Type       | 3.0.0 stored                                                   | 4.0 stores         |
| ---------- | -------------------------------------------------------------- | ------------------ |
| `date`     | `YYYY-MM-DDTHH:mm:ss.sssZ`, the author's midnight moved to UTC | `YYYY-MM-DD`       |
| `datetime` | `YYYY-MM-DDTHH:mm:ss.sssZ`, the picked clock moved to UTC      | `YYYY-MM-DDTHH:mm` |
| `time`     | not available                                                  | `HH:mm`            |

A date picker has no clock, so an instant lands on another day in another zone; with wall
time the author and every reader see the same day and clock. Values that come from outside
a workflow (an upstream output declared as `format: 'date-time'`) keep their zone and stay
instants. When a condition compares a set value with an instant, the worker reads the set
value in the workflow zone, which is UTC for now. A bare time that arrives with a zone is
compared as the clock written in it, without conversion.

Declare the properties these pickers write as `type: 'date'`, `type: 'datetime'` or
`type: 'time'` in the node schema, inside nested objects too. The SDK validates them itself;
`type: 'string'` with `format: 'date'` or `format: 'time'` is standard JSON Schema and
rejects the stored shapes.

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

## Custom errors shown through `globalControls`

The `MessageOnError` entry of `globalControls` listens on `#/properties/customError`. In
3.0.0 it listened on `#/properties/missingPreviousVariable` and carried a default `text`.

A custom error written to `properties.customErrors` with
`instancePath: '/missingPreviousVariable'` still marks the node with the exclamation mark,
but its message no longer shows in the properties panel. Change the path:

```ts
data.properties.customErrors = [
  {
    instancePath: '/customError',
    message: i18n.t('your.custom.message'),
    schemaPath: '',
    keyword: '',
    params: {},
  },
];
```

The message comes from the error itself; a `MessageOnError` of your own can still set `text`
to override it.

## Where to go next

- [Upgrade to 3.0](/get-started/upgrade-to-3/) if you come from 2.3.0.
- [Use the variable picker](/guides/use-variable-picker/) for the `VariableDynamic` control
  and the variable types behind these values.
