import type { TransformedToken } from 'style-dictionary';
import { describe, expect, it } from 'vitest';

import { cssVariableName } from './css-variable-name';

describe('cssVariableName', () => {
  it('moves the wb prefix into the design-system namespace', () => {
    const token = { path: ['wb', 'colors', 'brand'] } as TransformedToken;

    expect(cssVariableName(token)).toBe('wb-ds-colors-brand');
  });

  it('rejects names outside the wb namespace', () => {
    const token = { path: ['colors', 'brand'] } as TransformedToken;

    expect(() => cssVariableName(token)).toThrow('Expected token name to start with "wb-", received "colors-brand"');
  });
});
