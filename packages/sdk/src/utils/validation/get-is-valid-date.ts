import { getIsStringNumber } from './get-is-string-number';

export function getIsValidDate(date: undefined | string | Date | null): boolean {
  if (date === undefined) {
    return false;
  }

  if (date === null) {
    return false;
  }

  if (date instanceof Date) {
    return !Number.isNaN(date.getTime());
  }

  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime());
}

// 21:00 12:00 03:59
export function getIsValidTime(time: string = ''): boolean {
  const [hours, minutes] = time.split(':');

  if (!getIsStringNumber(hours) || !getIsStringNumber(minutes)) {
    return false;
  }

  const hoursNumber = Number(hours);
  const minutesNumber = Number(minutes);

  if (hoursNumber > 23 || hoursNumber < 0) {
    return false;
  }

  if (minutesNumber > 59 || minutesNumber < 0) {
    return false;
  }

  return true;
}
