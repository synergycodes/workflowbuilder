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

export function setDateWithTimeFromTime(date: Date, timeStamp: string) {
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
