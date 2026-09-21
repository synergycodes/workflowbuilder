import type { DatePickerType } from './types';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dayjsTokenToDateFns(token: string): string {
  // Convert the most common day.js tokens to date-fns equivalents. We only
  // remap the tokens we actually use as defaults; consumers passing a custom
  // `valueFormat` are expected to use date-fns tokens (see TSDoc).
  return token.replaceAll('YYYY', 'yyyy').replaceAll('DD', 'dd');
  // MM (months) is identical between the two libraries.
}

export function isDateTuple(value: unknown): value is [Date, Date] {
  return Array.isArray(value) && value.length === 2 && value[0] instanceof Date && value[1] instanceof Date;
}

/**
 * Parses a date string into a local `Date`.
 *
 * A bare `YYYY-MM-DD` string is parsed by the native `Date` constructor as UTC
 * midnight, which renders as the previous day in any negative-UTC-offset
 * timezone. We build such date-only values in local time instead; any other
 * format falls back to the native parser.
 */
export function parseDateValue(raw: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(raw);
  const parsed = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeInitialValue(
  raw: Date | [Date, Date] | Date[] | string | null | undefined,
  type: DatePickerType,
): Date | [Date, Date] | Date[] | null {
  if (raw == null) return null;
  if (type === 'default') {
    if (raw instanceof Date) return raw;
    if (typeof raw === 'string') {
      return parseDateValue(raw);
    }
    return null;
  }
  if (type === 'range') {
    return isDateTuple(raw) ? raw : null;
  }
  if (type === 'multiple') {
    return Array.isArray(raw) && raw.every((d) => d instanceof Date) ? (raw as Date[]) : null;
  }
  return null;
}
