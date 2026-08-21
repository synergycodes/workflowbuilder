import { describe, expect, it, vi } from 'vitest';

import { assertNoValueCollisions, findCssNameCollisions } from './validate-collisions';

describe('findCssNameCollisions', () => {
  it('finds names that kebab to the same CSS custom property', () => {
    const collisions = findCssNameCollisions({
      ax: {
        colors: {
          'acc7- 100': { value: '#cfd0d6', type: 'color' },
          'acc7-100': { value: '#cfd0d6', type: 'color' },
          'acc7-200': { value: '#a0a1ad', type: 'color' },
        },
      },
    });

    expect(collisions).toEqual([
      {
        cssName: '--ax-colors-acc7-100',
        entries: [
          { path: 'ax/colors/acc7- 100', value: '#cfd0d6' },
          { path: 'ax/colors/acc7-100', value: '#cfd0d6' },
        ],
        sameValue: true,
      },
    ]);
  });

  it('returns nothing for distinct names', () => {
    expect(
      findCssNameCollisions({
        ax: { colors: { 'gray-100': { value: '#eee', type: 'color' } } },
      }),
    ).toEqual([]);
  });
});

describe('assertNoValueCollisions', () => {
  it('only warns when the colliding values are identical', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tokens = {
      'Primitives/Mode 1': {
        ax: {
          colors: {
            'acc7- 100': { value: '#cfd0d6', type: 'color' },
            'acc7-100': { value: '#cfd0d6', type: 'color' },
          },
        },
      },
    };

    expect(() => assertNoValueCollisions(tokens, ['Primitives/Mode 1'])).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('throws when one CSS name would carry different values', () => {
    const tokens = {
      'Primitives/Mode 1': {
        ax: {
          colors: {
            'acc7- 100': { value: '#ffffff', type: 'color' },
            'acc7-100': { value: '#cfd0d6', type: 'color' },
          },
        },
      },
    };

    expect(() => assertNoValueCollisions(tokens, ['Primitives/Mode 1'])).toThrow(/--ax-colors-acc7-100/);
  });
});
