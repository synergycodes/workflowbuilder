import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

const typographyCss = readFileSync(path.join(import.meta.dirname, 'src/styles/typography.css'), 'utf8');

function colorSchemeOf(theme: 'light' | 'dark'): string | undefined {
  let value: string | undefined;
  postcss.parse(typographyCss).walkRules(`:is(#\\#, .workflow-builder-root)[data-wb-theme='${theme}']`, (rule) => {
    rule.walkDecls('color-scheme', (declaration) => {
      value = declaration.value;
    });
  });
  return value;
}

describe('color-scheme', () => {
  // Inherited: without it a dark host gives a light editor dark native scrollbars and inputs.
  it('follows the editor theme, not the host page', () => {
    expect(colorSchemeOf('light')).toBe('light');
    expect(colorSchemeOf('dark')).toBe('dark');
  });
});
