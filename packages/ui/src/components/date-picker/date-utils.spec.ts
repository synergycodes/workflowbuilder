import { dayjsTokenToDateFns, normalizeInitialValue, parseDateValue } from './date-utils';

describe('dayjsTokenToDateFns', () => {
  it('converts YYYY-MM-DD to yyyy-MM-dd', () => {
    expect(dayjsTokenToDateFns('YYYY-MM-DD')).toBe('yyyy-MM-dd');
  });

  it('converts DD/MM/YYYY to dd/MM/yyyy', () => {
    expect(dayjsTokenToDateFns('DD/MM/YYYY')).toBe('dd/MM/yyyy');
  });

  it('leaves tokens without YYYY/DD unchanged and preserves MM', () => {
    expect(dayjsTokenToDateFns('MM')).toBe('MM');
    expect(dayjsTokenToDateFns('HH:mm')).toBe('HH:mm');
  });
});

describe('parseDateValue', () => {
  it('parses a YYYY-MM-DD string as a local date', () => {
    const result = parseDateValue('2026-01-15');
    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(0);
    expect(result?.getDate()).toBe(15);
  });

  it('returns null for an invalid string', () => {
    expect(parseDateValue('not-a-date')).toBeNull();
  });

  it('parses a non-date-only string via the native Date constructor', () => {
    const result = parseDateValue('2026-01-15T10:30:00Z');
    expect(result).not.toBeNull();
    expect(result?.getTime()).toBe(new Date('2026-01-15T10:30:00Z').getTime());
  });
});

describe('normalizeInitialValue', () => {
  it('returns null for null/undefined', () => {
    expect(normalizeInitialValue(null, 'default')).toBeNull();
    expect(normalizeInitialValue(undefined, 'default')).toBeNull();
  });

  describe("type 'default'", () => {
    it('passes a Date through unchanged', () => {
      const date = new Date(2026, 0, 15);
      expect(normalizeInitialValue(date, 'default')).toBe(date);
    });

    it('parses a date string', () => {
      const result = normalizeInitialValue('2026-01-15', 'default');
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).getFullYear()).toBe(2026);
    });

    it('returns null for a non-date value', () => {
      expect(normalizeInitialValue([1, 2] as unknown as Date[], 'default')).toBeNull();
    });
  });

  describe("type 'range'", () => {
    it('returns a 2-Date tuple unchanged', () => {
      const tuple: [Date, Date] = [new Date(2026, 0, 1), new Date(2026, 0, 5)];
      expect(normalizeInitialValue(tuple, 'range')).toBe(tuple);
    });

    it('returns null for a non-tuple value', () => {
      expect(normalizeInitialValue([new Date(2026, 0, 1)], 'range')).toBeNull();
      expect(normalizeInitialValue(new Date(2026, 0, 1), 'range')).toBeNull();
    });
  });

  describe("type 'multiple'", () => {
    it('returns an array of Dates unchanged', () => {
      const dates = [new Date(2026, 0, 1), new Date(2026, 0, 2), new Date(2026, 0, 3)];
      expect(normalizeInitialValue(dates, 'multiple')).toBe(dates);
    });

    it('returns null for a mixed array', () => {
      expect(normalizeInitialValue([new Date(2026, 0, 1), 'x'] as unknown as Date[], 'multiple')).toBeNull();
    });
  });
});
