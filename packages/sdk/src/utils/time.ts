import { format, setHours, setMinutes } from 'date-fns';

import { getIsValidDate, getIsValidTime } from './validation/get-is-valid-date';

export function getDateIfValid(dateString?: string): undefined | Date {
  if (!dateString) {
    return undefined;
  }

  const date = new Date(dateString);

  const isValid = !Number.isNaN(date.getTime());

  return isValid ? date : undefined;
}

export function getTimeFromDateIfValid(dateString?: string): undefined | string {
  if (!dateString) {
    return undefined;
  }

  const date = new Date(dateString);

  const isValid = !Number.isNaN(date.getTime());

  if (!isValid) {
    return undefined;
  }

  return format(date, 'HH:mm');
}

type DateLike = Date | number | string;

export function getISODate(dateLike: DateLike | null): string {
  if (!dateLike) {
    console.warn(`DateString expected but missing`);

    return '';
  }

  if (typeof (dateLike as Date)?.toISOString === 'function') {
    return (dateLike as Date)?.toISOString();
  }

  if (typeof dateLike === 'number') {
    const date = new Date(dateLike);

    const isValidDate = !Number.isNaN(date.getTime());
    if (!isValidDate) {
      console.warn(`DateString doesn't support number`, dateLike);
      return '';
    }

    const year = date.getFullYear();
    const dateISO = date.toISOString();
    if (year < 1980) {
      console.warn(`DateString is a number but may be wrong`, dateLike, dateISO);
    }

    return dateISO;
  }

  if (typeof dateLike === 'string') {
    const date = new Date(dateLike);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }

    console.warn(`DateString doesn't support string`, dateLike);

    return dateLike;
  }

  console.warn(`DateString doesn't support ISO`, dateLike);

  return dateLike ? dateLike.toString() : '';
}

export function setDateWithTimeFromTime(date: string | Date, timeStamp: string) {
  if (!date || !timeStamp) {
    return date;
  }

  if (!getIsValidDate(date)) {
    console.error('Tried to set time on incorrect date.');
    return date;
  }

  if (!getIsValidTime(timeStamp)) {
    console.error('Tried to set date with incorrect timestamp.');
    return date;
  }

  const [hours, minutes] = timeStamp.split(':').map(Number);

  return setMinutes(setHours(date, hours), minutes);
}
