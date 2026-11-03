### Title: Date and time values are zone-less wall time

### Proposed by: Szymon Tondowski

### Date: 02.11.2026 (recorded 03.11.2026)

## Context

`DynamicTypedInput` (`features/variables/components/dynamic-typed-input/`) offers three pickers: `date`, `datetime` and `time` (`VariableTypePrimitive` in `@workflow-builder/types/variables`). What they save is a string in the node's `properties`. That string is rendered again in the picker, possibly in another browser, and compared at run time by the decision executor (`apps/execution-worker/src/executors/decision.ts`), in whatever zone the worker runs in.

The obvious route, a `Date` object serialized with `toISOString()` and parsed back with `new Date(string)`, converts zones on both ends:

- `toISOString()` converts to UTC. A `Date` for 15.01.2024 00:30 in Kiritimati (UTC+14) serializes as `2024-01-14T10:30:00.000Z`; the day moved.
- `new Date('2024-01-15')` parses a bare date as UTC midnight, while `new Date('2024-01-15T09:07')` parses as local time. In Pago Pago (UTC-11) the bare date reads back as the 14th.

On that route a datetime typed as 15.01.2024 09:07 in Warsaw is stored as `2024-01-15T08:07:00.000Z`, displays as 09:07 in Warsaw and as 00:07 in Los Angeles, and a bare date can render as the previous day for its own author. The question was whether a picked value means an instant (one moment, shown in the viewer's zone) or wall time (the day and clock as written, the same for everyone).

## Decision

A picked value is wall time and carries no zone. `2020-10-31` is that day for everyone, `09:07` is that clock for everyone, `2020-10-31T09:07` is both. What is in the picker is what is stored, what is stored is what every reader sees, with no conversion in either direction.

Stored shapes:

| Type       | Saved              | Note                                                                                                                                                                                                        |
| ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date`     | `YYYY-MM-DD`       |                                                                                                                                                                                                             |
| `datetime` | `YYYY-MM-DDTHH:mm` | No seconds, no offset.                                                                                                                                                                                      |
| `time`     | `HH:mm:00+00:00`   | The suffix is nominal: JSON Schema `format: 'time'` (RFC 3339 full-time, used by the demo trigger schema) requires an offset. Readers strip it with `getTimeHHmm` and never apply it. It does not mean UTC. |

`utils/time-iso.ts` is the only code that reads or writes these shapes. Strings are sliced by position, `Date` objects are read with the local getters (`getFullYear`, `getHours`, ...), and `getDateIfValid` builds a `Date` from the written parts instead of `new Date(string)`. `toISOString()` is not used. A value that arrives with seconds or an offset (an upstream output such as `2024-01-15T09:07:30Z`) is read as the clock written in it; the offset is dropped, not applied.

The `DatePicker` in `@workflowbuilder/ui` holds the same line on its side: `date-picker/date-utils.ts` builds a bare `YYYY-MM-DD` as a local `Date` (`parseDateValue`), so the SDK can hand it the stored string.

`time-iso.spec.ts` runs every case under five zones including UTC+14 and UTC-11, and asserts the exact inputs where `toISOString()` and `new Date(string)` move the day.

## Alternative Options Considered

- Instants: store UTC ISO strings with `Z` and convert to the viewer's zone on display. Rejected. A date picker has no clock, so the stored instant is an arbitrary midnight that lands on a different day in another zone; author and reader of one workflow see different days. The worker is in yet another zone, so `09:00` would mean a different clock per deployment.
- Wall time plus the author's zone next to it. Not needed by any consumer today; it needs a zone picker in the UI and zone arithmetic in the worker. Deferred, not rejected: see "When a zone is needed".
- Keep `new Date(string)` and fix the display. Rejected: the day is already lost at parse time, before anything renders.

## Consequences

- Any code that touches these values goes through `time-iso.ts`. Never `toISOString()`, `new Date('YYYY-MM-DD')` or `Date.parse` on them. The file header states the rule.
- The `+00:00` on `time` misleads any reader that treats it as RFC 3339. Nothing in the repo does; an export that converts it to an instant would be off by the viewer's offset.
- Known gap: `compareInstants` in `decision.ts` orders bare `HH:mm` by seconds of the day (against another clock or the clock inside a datetime), but `date` and `datetime` still go through `new Date(value).getTime()`. Same-shape comparisons agree, but a bare date parses as UTC midnight and a `YYYY-MM-DDTHH:mm` as local, so `date` against `datetime` is off by the worker's offset unless the worker runs in UTC, and nothing pins its zone (no `TZ` in `deploy/`). Direction: parse both sides from their parts, as `getDateIfValid` does. (follow-up: zone-less-date-compare-in-worker)
- Validation of these types is a separate decision: `validation/workflow-builder-validator/variable-references-and-date-types.decision-log.md` § 2.

## When a zone is needed

Nothing asks for one today. When a consumer does (a schedule that must fire at 09:00 Warsaw time, a deadline shared across offices), extend the model, do not reinterpret it:

- Keep the stored shapes. Add the zone as a separate field holding an IANA name (`Europe/Warsaw`), never an offset inside the string: an offset is one snapshot, the name survives DST.
- A value without a zone keeps meaning wall time, so existing workflows need no migration.
- The worker converts at the point of use (comparison, scheduling) with `Intl.DateTimeFormat` or `date-fns-tz`; the UI keeps showing the written digits with the zone as a label next to them.
- Where the zone comes from is open: a per-field picker, or a workflow-level default captured at save time. Decide when the consumer appears.

## Status

Accepted, with the decision executor gap open.
