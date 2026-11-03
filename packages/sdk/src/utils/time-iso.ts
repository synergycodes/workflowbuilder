import { format } from 'date-fns';

import { getIsValidTime } from './validation/get-is-valid-date';

/**
 * Zone-less ISO: `YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm`.
 * Strings are sliced, Dates are read with local getters. Never `toISOString()` - that converts to UTC and can move the day.
 * Why no zone: time-iso.decision-log.md next to this file.
 */

type DateLike = Date | number | string;

export type DateYYYYMMDD = `${number}-${number}-${number}`;
export type TimeHHmm = `${number}:${number}`;
export type TimeHHmmISO = `${TimeHHmm}:00+00:00`;
export type DateTimeISO = `${DateYYYYMMDD}T${TimeHHmm}`;

const TIME_ISO_SUFFIX = ':00+00:00';

const DATE_LENGTH = 'YYYY-MM-DD'.length;
const TIME_LENGTH = 'HH:mm'.length;
const DATE_TIME_LENGTH = 'YYYY-MM-DDTHH:mm'.length;

const datePrefixPattern = /^\d{4}-\d{2}-\d{2}(?!\d)/;
const dateTimePrefixPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?!\d)/;
const timePattern = /^\d{2}:\d{2}$/;

const getIsValidDateObject = (date: Date): boolean => !Number.isNaN(date.getTime());

const getIsRealCalendarDay = (year: number, month: number, day: number): boolean => {
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

/**
 * Local Date for the value. `YYYY-MM-DD[THH:mm]` strings are built from their parts:
 * `new Date('2024-01-15')` would parse as UTC midnight and show the previous day west of UTC.
 */
export function getDateIfValid(dateLike?: DateLike | null): undefined | Date {
  if (!dateLike) {
    return undefined;
  }

  if (typeof dateLike === 'string' && datePrefixPattern.test(dateLike)) {
    const [year, month, day] = dateLike.slice(0, DATE_LENGTH).split('-').map(Number);

    if (!getIsRealCalendarDay(year, month, day)) {
      return undefined;
    }

    const time = getTimeHHmm(dateLike);
    const [hours, minutes] = time ? time.split(':').map(Number) : [0, 0];

    return new Date(year, month - 1, day, hours, minutes);
  }

  const date = new Date(dateLike);

  return getIsValidDateObject(date) ? date : undefined;
}

export const getDateYYYYMMDD = (dateLike?: DateLike | null): DateYYYYMMDD | undefined => {
  if (!dateLike) {
    return undefined;
  }

  if (typeof dateLike === 'string' && datePrefixPattern.test(dateLike)) {
    const dateYYYYMMDD = dateLike.slice(0, DATE_LENGTH);
    const [year, month, day] = dateYYYYMMDD.split('-').map(Number);

    return getIsRealCalendarDay(year, month, day) ? (dateYYYYMMDD as DateYYYYMMDD) : undefined;
  }

  const date = getDateIfValid(dateLike);

  return date ? (format(date, 'yyyy-MM-dd') as DateYYYYMMDD) : undefined;
};

/**
 * `HH:mm` from a Date, a `HH:mm[:ss...]` string, or `YYYY-MM-DDTHH:mm...`.
 * Seconds and any `Z` / `+00:00` suffix (as `getTimeHHmmISO` writes) are dropped, never applied.
 * A bare `YYYY-MM-DD` and any other string carry no clock, so they yield undefined rather than `00:00`.
 */
export const getTimeHHmm = (dateLike?: DateLike | null): TimeHHmm | undefined => {
  if (!dateLike) {
    return undefined;
  }

  if (typeof dateLike === 'string') {
    const time = dateTimePrefixPattern.test(dateLike)
      ? dateLike.slice(DATE_LENGTH + 1, DATE_TIME_LENGTH)
      : dateLike.slice(0, TIME_LENGTH);

    return timePattern.test(time) && getIsValidTime(time) ? (time as TimeHHmm) : undefined;
  }

  const date = getDateIfValid(dateLike);

  return date ? (format(date, 'HH:mm') as TimeHHmm) : undefined;
};

/**
 * `HH:mm:00+00:00`: the clock of `getTimeHHmm` in the RFC 3339 shape JSON Schema `format: 'time'` requires.
 * The offset is nominal, the clock stays wall time; readers strip it through `getTimeHHmm`.
 */
export const getTimeHHmmISO = (dateLike?: DateLike | null): TimeHHmmISO | undefined => {
  const timeHHmm = getTimeHHmm(dateLike);

  return timeHHmm ? `${timeHHmm}${TIME_ISO_SUFFIX}` : undefined;
};

/** `YYYY-MM-DDTHH:mm`: the day of `date` with the clock of `time` (`HH:mm` or anything that carries one). */
export const getDateTimeISO = (
  date?: DateLike | null,
  time?: DateLike | null,
  fallbackTime: TimeHHmm = '00:00',
): DateTimeISO | undefined => {
  const dateYYYYMMDD = getDateYYYYMMDD(date);

  if (!dateYYYYMMDD) {
    return undefined;
  }

  return `${dateYYYYMMDD}T${getTimeHHmm(time) ?? fallbackTime}`;
};
