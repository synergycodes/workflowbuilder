/**
 * Date and time comparison for condition operators, with no `new Date(text)` anywhere.
 *
 * Two kinds of value meet here. A value set in the editor is zone-less wall time (`2026-01-15`, `09:00`,
 * `2026-01-15T09:00`). A value from outside carries a zone (`2026-01-15T09:00:00Z`) and is an instant. A set
 * value is read in the workflow zone, which is UTC for now, so `2026-01-15T09:00` and `2026-01-15T09:00:00Z`
 * are the same moment in every worker. Why the model: packages/sdk/src/utils/time-iso.decision-log.md.
 */

export type DateTimeComparisonOperator = 'isBefore' | 'isAfter' | 'isEqual' | 'isNotEqual';

type ParsedDateTime =
  | { kind: 'date'; dayMs: number }
  | { kind: 'datetime'; ms: number }
  | { kind: 'time'; secondsOfDay: number };

const DAY_MS = 86_400_000;

const dateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const timePattern = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

const getIsValidClock = (hours: number, minutes: number, seconds: number): boolean =>
  hours < 24 && minutes < 60 && seconds < 60;

const getIsRealCalendarDay = (year: number, month: number, day: number): boolean => {
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

function getOffsetMs(offset: string | undefined): number {
  if (!offset || offset === 'Z') {
    return 0;
  }

  const sign = offset.startsWith('-') ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(':').map(Number);

  return sign * (hours * 60 + minutes) * 60_000;
}

function parseDateTime(value: string): ParsedDateTime | undefined {
  const dateMatch = dateTimePattern.exec(value);

  if (dateMatch) {
    const [, year, month, day, hours, minutes, seconds, fraction, offset] = dateMatch;
    const dayMs = Date.UTC(Number(year), Number(month) - 1, Number(day));

    if (!getIsRealCalendarDay(Number(year), Number(month), Number(day))) {
      return undefined;
    }

    if (hours === undefined) {
      return { kind: 'date', dayMs };
    }

    const clock = [Number(hours), Number(minutes), Number(seconds ?? 0)] as const;

    if (!getIsValidClock(...clock)) {
      return undefined;
    }

    const millis = fraction ? Number(fraction.padEnd(3, '0').slice(0, 3)) : 0;
    const wallMs = dayMs + (clock[0] * 3600 + clock[1] * 60 + clock[2]) * 1000 + millis;

    return { kind: 'datetime', ms: wallMs - getOffsetMs(offset) };
  }

  const timeMatch = timePattern.exec(value);

  if (timeMatch) {
    const clock = [Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3] ?? 0)] as const;

    // A zone on a bare clock is dropped, not applied (known limitation of the UTC-only workflow zone).
    return getIsValidClock(...clock)
      ? { kind: 'time', secondsOfDay: clock[0] * 3600 + clock[1] * 60 + clock[2] }
      : undefined;
  }

  return undefined;
}

const getSecondsOfDay = (ms: number): number => Math.floor((((ms % DAY_MS) + DAY_MS) % DAY_MS) / 1000);
const getDayMs = (ms: number): number => Math.floor(ms / DAY_MS) * DAY_MS;

const toSecondsOfDay = (side: ParsedDateTime): number | undefined =>
  side.kind === 'time' ? side.secondsOfDay : side.kind === 'datetime' ? getSecondsOfDay(side.ms) : undefined;

const toDayMs = (side: ParsedDateTime): number | undefined =>
  side.kind === 'date' ? side.dayMs : side.kind === 'datetime' ? getDayMs(side.ms) : undefined;

const pair = (a: number | undefined, b: number | undefined): [number, number] | undefined =>
  a === undefined || b === undefined ? undefined : [a, b];

/** The two numbers to compare, on a common axis; undefined when the kinds share none (a clock against a day). */
function getComparable(left: ParsedDateTime, right: ParsedDateTime): [number, number] | undefined {
  if (left.kind === 'time' || right.kind === 'time') {
    return pair(toSecondsOfDay(left), toSecondsOfDay(right));
  }

  if (left.kind === 'date' || right.kind === 'date') {
    return pair(toDayMs(left), toDayMs(right));
  }

  return [left.ms, right.ms];
}

/**
 * Compares two date, datetime or time strings with the given operator.
 * A bare time compares by clock (against another clock or the clock inside a datetime), a bare date by day,
 * anything else by moment. `isBefore` and `isAfter` are inclusive. Undefined when either side is not a date
 * or time, or when a clock meets a bare date, so the caller can compare the pair the way it would any text.
 */
export function compareDateTime(
  left: string,
  right: string,
  operator: DateTimeComparisonOperator,
): boolean | undefined {
  const leftParsed = parseDateTime(left.trim());
  const rightParsed = parseDateTime(right.trim());

  if (!leftParsed || !rightParsed) {
    return undefined;
  }

  const comparable = getComparable(leftParsed, rightParsed);

  if (!comparable) {
    return undefined;
  }

  const [a, b] = comparable;

  switch (operator) {
    case 'isBefore': {
      return a <= b;
    }
    case 'isAfter': {
      return a >= b;
    }
    case 'isEqual': {
      return a === b;
    }
    case 'isNotEqual': {
      return a !== b;
    }
  }
}
