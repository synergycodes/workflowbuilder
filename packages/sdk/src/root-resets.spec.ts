import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

const indexCss = readFileSync(path.join(import.meta.dirname, 'index.css'), 'utf8');

function declarationsOf(selector: string): Map<string, string> {
  const declarations = new Map<string, string>();
  postcss.parse(indexCss).walkRules((rule) => {
    if (rule.selector !== selector) return;
    rule.walkDecls((declaration) => {
      declarations.set(declaration.prop, declaration.value);
    });
  });
  return declarations;
}

describe('editor root resets', () => {
  // Hosts set these on <body> (Next.js and Tailwind `antialiased`, `tabular-nums`); all of them inherit.
  it('stops inherited host typography at the editor edge', () => {
    const root = declarationsOf(String.raw`:is(#\#, .workflow-builder-root).workflow-builder-root`);

    expect(root.get('-webkit-font-smoothing')).toBe('auto');
    expect(root.get('-moz-osx-font-smoothing')).toBe('auto');
    expect(root.get('font-variant-numeric')).toBe('normal');
    expect(root.get('font-feature-settings')).toBe('normal');
    expect(root.get('letter-spacing')).toBe('normal');
  });
});
