import { describe, expect, it } from 'vitest';

import { isUuid } from './is-uuid';

describe('isUuid', () => {
  it.each(['0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11', '0B6E7D9C-4B1A-4C2E-9A3F-2F7A1D8E5C11'])('accepts %s', (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each([
    '',
    'e-1',
    'not-a-uuid',
    '{0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11}',
    '0b6e7d9c4b1a4c2e9a3f2f7a1d8e5c11',
    '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11 ',
    '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c1g',
  ])('refuses %j', (value) => {
    expect(isUuid(value)).toBe(false);
  });
});
