import { afterEach, describe, expect, it } from 'vitest';

import { getDateIfValid, getDateTimeISO, getDateYYYYMMDD, getTimeHHmm, getTimeHHmmISO } from './time-iso';

// Both sides of the date line: UTC+14 and UTC-11. Node re-reads process.env.TZ at runtime.
const zones = ['UTC', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Europe/Warsaw', 'America/Los_Angeles'];
const originalTZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTZ;
});

describe('getDateYYYYMMDD', () => {
  it.each(zones)('should keep the local calendar day of a Date in %s', (zone) => {
    process.env.TZ = zone;

    expect(getDateYYYYMMDD(new Date(2024, 0, 15, 0, 30))).toBe('2024-01-15');
    expect(getDateYYYYMMDD(new Date(2024, 0, 15, 23, 30))).toBe('2024-01-15');
  });

  it.each(zones)('should keep the day written in a string in %s', (zone) => {
    process.env.TZ = zone;

    expect(getDateYYYYMMDD('2024-01-15')).toBe('2024-01-15');
    expect(getDateYYYYMMDD('2024-01-15T00:30')).toBe('2024-01-15');
    expect(getDateYYYYMMDD('2024-01-15T23:30')).toBe('2024-01-15');
  });

  it('should ignore the zone where toISOString moves the day', () => {
    process.env.TZ = 'Pacific/Kiritimati';
    const justAfterMidnight = new Date(2024, 0, 15, 0, 30);

    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2024-01-14');
    expect(getDateYYYYMMDD(justAfterMidnight)).toBe('2024-01-15');

    process.env.TZ = 'Pacific/Pago_Pago';
    const justBeforeMidnight = new Date(2024, 0, 15, 23, 30);

    expect(justBeforeMidnight.toISOString().slice(0, 10)).toBe('2024-01-16');
    expect(getDateYYYYMMDD(justBeforeMidnight)).toBe('2024-01-15');
  });

  it('should ignore the zone where new Date(string) moves a bare date', () => {
    process.env.TZ = 'Pacific/Pago_Pago';

    expect(new Date('2024-01-15').getDate()).toBe(14);
    expect(getDateYYYYMMDD('2024-01-15')).toBe('2024-01-15');
  });

  it('should zero-pad month and day', () => {
    expect(getDateYYYYMMDD(new Date(2024, 2, 5))).toBe('2024-03-05');
  });

  it('should reject malformed or impossible dates', () => {
    expect(getDateYYYYMMDD()).toBeUndefined();
    expect(getDateYYYYMMDD(null)).toBeUndefined();
    expect(getDateYYYYMMDD('')).toBeUndefined();
    expect(getDateYYYYMMDD('nope')).toBeUndefined();
    expect(getDateYYYYMMDD('2024-13-01')).toBeUndefined();
    expect(getDateYYYYMMDD('2024-02-30')).toBeUndefined();
    expect(getDateYYYYMMDD(new Date('nope'))).toBeUndefined();
  });
});

describe('getTimeHHmm', () => {
  it.each(zones)('should keep the local wall clock of a Date in %s', (zone) => {
    process.env.TZ = zone;

    expect(getTimeHHmm(new Date(2024, 0, 15, 0, 5))).toBe('00:05');
    expect(getTimeHHmm(new Date(2024, 0, 15, 23, 59))).toBe('23:59');
  });

  it.each(zones)('should keep the clock written in a string in %s', (zone) => {
    process.env.TZ = zone;

    expect(getTimeHHmm('2024-01-15T09:07')).toBe('09:07');
    expect(getTimeHHmm('2024-01-15T23:59')).toBe('23:59');
    expect(getTimeHHmm('09:07')).toBe('09:07');
    expect(getTimeHHmm('09:07:30')).toBe('09:07');
    expect(getTimeHHmm('09:07:30Z')).toBe('09:07');
  });

  it.each(zones)('should drop the seconds and offset getTimeHHmmISO writes in %s', (zone) => {
    process.env.TZ = zone;

    expect(getTimeHHmm('09:07:00+00:00')).toBe('09:07');
    expect(getTimeHHmm('23:59:00+00:00')).toBe('23:59');
    expect(getTimeHHmm('09:07:30+02:00')).toBe('09:07');
    expect(getTimeHHmm('2024-01-15T09:07:00+00:00')).toBe('09:07');
  });

  it('should return undefined when the string carries no clock', () => {
    expect(getTimeHHmm('2024-01-15')).toBeUndefined();
    expect(getTimeHHmm('2024-01-15T99:99')).toBeUndefined();
    expect(getTimeHHmm('99:99')).toBeUndefined();
    expect(getTimeHHmm('9:07')).toBeUndefined();
    expect(getTimeHHmm('1')).toBeUndefined();
    expect(getTimeHHmm('12:')).toBeUndefined();
    expect(getTimeHHmm('')).toBeUndefined();
    expect(getTimeHHmm()).toBeUndefined();
  });
});

describe('getTimeHHmmISO', () => {
  it.each(zones)('should append :00+00:00 to the wall clock in %s', (zone) => {
    process.env.TZ = zone;

    expect(getTimeHHmmISO('09:07')).toBe('09:07:00+00:00');
    expect(getTimeHHmmISO('23:59')).toBe('23:59:00+00:00');
    expect(getTimeHHmmISO(new Date(2024, 0, 15, 9, 7))).toBe('09:07:00+00:00');
    expect(getTimeHHmmISO('2024-01-15T09:07')).toBe('09:07:00+00:00');
  });

  it('should keep an already suffixed value stable', () => {
    expect(getTimeHHmmISO('09:07:00+00:00')).toBe('09:07:00+00:00');
    expect(getTimeHHmmISO('09:07:30Z')).toBe('09:07:00+00:00');
  });

  it('should return undefined when there is no clock', () => {
    expect(getTimeHHmmISO('2024-01-15')).toBeUndefined();
    expect(getTimeHHmmISO('99:99')).toBeUndefined();
    expect(getTimeHHmmISO('')).toBeUndefined();
    expect(getTimeHHmmISO()).toBeUndefined();
  });
});

describe('getDateTimeISO', () => {
  it('should join date and time with a T and no zone', () => {
    expect(getDateTimeISO('2024-01-15', '09:07')).toBe('2024-01-15T09:07');
    expect(getDateTimeISO('2024-01-15T23:59', '09:07')).toBe('2024-01-15T09:07');
    expect(getDateTimeISO(new Date(2024, 0, 15, 23, 59), '09:07')).toBe('2024-01-15T09:07');
  });

  it('should take the clock from anything that carries one', () => {
    expect(getDateTimeISO('2024-01-15', new Date(2000, 5, 1, 9, 7))).toBe('2024-01-15T09:07');
    expect(getDateTimeISO('2024-01-15', '2000-06-01T09:07')).toBe('2024-01-15T09:07');
  });

  it('should fall back when the time carries no clock', () => {
    expect(getDateTimeISO('2024-01-15')).toBe('2024-01-15T00:00');
    expect(getDateTimeISO('2024-01-15', '2000-06-01', '23:59')).toBe('2024-01-15T23:59');
    expect(getDateTimeISO('2024-01-15', '24:00')).toBe('2024-01-15T00:00');
  });

  it('should reject a missing date', () => {
    expect(getDateTimeISO(undefined, '09:07')).toBeUndefined();
    expect(getDateTimeISO('nope', '09:07')).toBeUndefined();
  });
});

describe('getDateIfValid', () => {
  it.each(zones)('should build a local Date with the written fields in %s', (zone) => {
    process.env.TZ = zone;

    const date = getDateIfValid('2024-01-15T00:30');

    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(15);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(30);
  });

  it.each(zones)('should keep a bare date on its day at midnight in %s', (zone) => {
    process.env.TZ = zone;

    const date = getDateIfValid('2024-01-15');

    expect(date?.getDate()).toBe(15);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
  });

  it.each(zones)('should round-trip through getDateYYYYMMDD and getTimeHHmm in %s', (zone) => {
    process.env.TZ = zone;

    const date = getDateIfValid('2024-01-15T23:30');

    expect(getDateYYYYMMDD(date)).toBe('2024-01-15');
    expect(getTimeHHmm(date)).toBe('23:30');
  });

  it('should return undefined for garbage', () => {
    expect(getDateIfValid()).toBeUndefined();
    expect(getDateIfValid('')).toBeUndefined();
    expect(getDateIfValid('nope')).toBeUndefined();
    expect(getDateIfValid('2024-02-30')).toBeUndefined();
  });
});
