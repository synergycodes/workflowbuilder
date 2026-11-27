import { describe, expect, it } from 'vitest';

import { compareDateTime } from './compare-date-time';

// CI runs in UTC, where a local-time reading of a zone-less value is indistinguishable from the workflow
// zone. Node reads TZ at runtime, so this file pins a zone east of UTC before anything touches Date.
process.env.TZ = 'Europe/Warsaw';

describe('compareDateTime in Europe/Warsaw', () => {
  it('still reads a zone-less datetime in the workflow zone, not in the worker zone', () => {
    expect(new Date(2024, 0, 15, 9, 0).getTimezoneOffset()).toBe(-60);

    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00:00Z', 'isEqual')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00:00Z', 'isAfter')).toBe(true);
    expect(compareDateTime('2024-01-15T09:00', '2024-01-15T09:00:00Z', 'isBefore')).toBe(true);
  });

  it('still reads a bare date and a zone-less datetime on the same day as the same day', () => {
    expect(compareDateTime('2024-01-15T00:30', '2024-01-15', 'isEqual')).toBe(true);
    expect(compareDateTime('2024-01-15T00:30', '2024-01-15', 'isAfter')).toBe(true);
    expect(compareDateTime('2024-01-15', '2024-01-15T23:30:00Z', 'isEqual')).toBe(true);
  });
});
