import { describe, expect, it } from 'vitest';

import { toFileName } from './to-file-name';

describe('toFileName', () => {
  it('replaces slashes with hyphens', () => {
    expect(toFileName('primitives/mode-1')).toBe('primitives-mode-1');
  });

  it('kebab-cases camelCase names', () => {
    expect(toFileName('numeralsMode')).toBe('numerals-mode');
  });

  it('kebab-cases a slash-separated camelCase path', () => {
    expect(toFileName('semanticTokens/lightTheme')).toBe('semantic-tokens-light-theme');
  });

  it('leaves an already-kebab name unchanged', () => {
    expect(toFileName('tokens')).toBe('tokens');
  });
});
