import { describe, expect, it } from 'vitest';

import { hasText } from './has-text';

describe('hasText', () => {
  it('accepts a string with text around its whitespace', () => {
    expect(hasText('  Too high ')).toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['whitespace', ' \n\t'],
    ['a number', 120],
    ['undefined', undefined],
  ])('refuses %s', (_name, value) => {
    expect(hasText(value)).toBe(false);
  });
});
