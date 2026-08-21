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

  it('throws when sets in one CSS scope define the same name', () => {
    const tokens = {
      'Tokens/Dark': {
        wb: { shadow: { color: { value: '#111111', type: 'color' } } },
      },
      'Effects/dark': {
        wb: { shadow: { color: { value: '#222222', type: 'color' } } },
      },
    };

    expect(() =>
      assertNoValueCollisions(tokens, ['Tokens/Dark', 'Effects/dark'], [['Tokens/Dark', 'Effects/dark']]),
    ).toThrow(/'Tokens\/Dark' and 'Effects\/dark' both emit --wb-shadow-color/);
  });

  it('accepts disjoint names from sets in one CSS scope', () => {
    const tokens = {
      'Tokens/Light': {
        wb: { ui: { background: { value: '#ffffff', type: 'color' } } },
      },
      'Effects/light': {
        wb: { shadow: { color: { value: '#111111', type: 'color' } } },
      },
    };

    expect(() =>
      assertNoValueCollisions(tokens, ['Tokens/Light', 'Effects/light'], [['Tokens/Light', 'Effects/light']]),
    ).not.toThrow();
  });
});
