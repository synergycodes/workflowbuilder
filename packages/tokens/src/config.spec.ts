import { describe, expect, it } from 'vitest';

import { config } from '../config';

describe('token selectors', () => {
  it('scopes themed sets to the data-wb-theme attribute, never to html', () => {
    const themed = config.themes.filter((t) => t.set !== 'Canvas/value');
    expect(themed.map((t) => t.selector)).toEqual([
      "[data-wb-theme='dark']",
      "[data-wb-theme='light']",
      "[data-wb-theme='dark']",
      "[data-wb-theme='light']",
    ]);
    expect(config.themes.every((t) => !t.selector.startsWith('html'))).toBe(true);
    expect(config.themes.find((t) => t.set === 'Canvas/value')?.selector).toBe(':root');
  });
});
