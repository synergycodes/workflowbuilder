import { describe, expect, it } from 'vitest';

import { compareDateTime } from './compare-date-time';

describe('compareDateTime', () => {
  it('reads a zone-less datetime in the workflow zone (UTC), so it equals the matching instant', () => {
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00:00Z', 'isEqual')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00:00.000Z', 'isNotEqual')).toBe(false);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T10:00:00+01:00', 'isEqual')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00:30Z', 'isBefore')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00:30Z', 'isAfter')).toBe(false);
  });

  it('orders two set datetimes by moment, inclusively', () => {
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00', 'isBefore')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00', 'isAfter')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-16T08:00', 'isBefore')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-16T08:00', 'isAfter')).toBe(false);
  });

  it('compares by day when one side is a bare date', () => {
    expect(compareDateTime('2024-01-15', '2024-01-15T23:59', 'isEqual')).toBe(true);
    expect(compareDateTime('2024-01-15T00:30', '2024-01-15', 'isBefore')).toBe(true);
    expect(compareDateTime('2024-01-15T00:30', '2024-01-15', 'isAfter')).toBe(true);
    expect(compareDateTime('2024-01-14', '2024-01-15T00:00:00Z', 'isBefore')).toBe(true);
    expect(compareDateTime('2024-01-14', '2024-01-15T00:00:00Z', 'isEqual')).toBe(false);
    expect(compareDateTime('2024-01-15', '2024-01-14T23:30:00-01:00', 'isEqual')).toBe(true);
  });

  it('compares a bare time by clock against another clock or the clock inside a datetime', () => {
    expect(compareDateTime('09:07', '09:07:00', 'isEqual')).toBe(true);
    expect(compareDateTime('09:07', '10:00', 'isBefore')).toBe(true);
    expect(compareDateTime('09:07', '10:00:30', 'isAfter')).toBe(false);
    expect(compareDateTime('09:07', '2024-01-15T09:07', 'isEqual')).toBe(true);
    expect(compareDateTime('09:07', '2024-01-15T10:00:00Z', 'isBefore')).toBe(true);
    expect(compareDateTime('2024-01-15T10:00:00+01:00', '09:00', 'isEqual')).toBe(true);
  });

  it('reads a zone on a bare clock as the clock written, not as a conversion', () => {
    expect(compareDateTime('09:07', '09:07:00+00:00', 'isEqual')).toBe(true);
    expect(compareDateTime('09:07', '09:07:00+02:00', 'isEqual')).toBe(true);
  });

  it('is undefined for a clock against a bare date, and for anything that is not a date or time', () => {
    expect(compareDateTime('09:07', '2024-01-15', 'isBefore')).toBeUndefined();
    expect(compareDateTime('10:30 standup', '10:30 standup', 'isEqual')).toBeUndefined();
    expect(compareDateTime('2024-01-15', 'tomorrow', 'isBefore')).toBeUndefined();
    expect(compareDateTime('', '2024-01-15', 'isBefore')).toBeUndefined();
    expect(compareDateTime('2024-02-30', '2024-03-01', 'isBefore')).toBeUndefined();
    expect(compareDateTime('25:00', '09:00', 'isBefore')).toBeUndefined();
    expect(compareDateTime('2024-01-15T24:00', '2024-01-15', 'isEqual')).toBeUndefined();
  });

  it('ignores surrounding whitespace', () => {
    expect(compareDateTime(' 2024-01-15 ', '2024-01-15', 'isEqual')).toBe(true);
  });
});
