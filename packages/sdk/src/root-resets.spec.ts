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
  // Seen on a host with `svg path { fill: yellow }`: every node icon turned yellow.
  it('keeps the paint of currentColor icons against host rules on the svg and on its shapes', () => {
    const prefix = String.raw`:is(#\#, .workflow-builder-root) `;

    expect(declarationsOf(`${prefix}:where(svg[fill='currentColor'])`).get('fill')).toBe('currentColor');
    expect(declarationsOf(`${prefix}:where(svg[fill='currentColor'] :not([fill]))`).get('fill')).toBe('inherit');
    expect(declarationsOf(`${prefix}:where(svg[fill='currentColor'] :not([stroke]))`).get('stroke')).toBe('inherit');
  });

  // Its paths carry `fill="currentColor"` themselves; without it on the <svg> the rules above skip the logo.
  it('marks the header logo and its paths as currentColor so the icon rules cover it', () => {
    const logo = readFileSync(path.join(import.meta.dirname, 'assets/workflow-builder-logo.svg'), 'utf8');
    const prefix = String.raw`:is(#\#, .workflow-builder-root) `;

    expect(logo).toMatch(/^<svg [^>]*fill="currentColor"/);
    expect(logo).not.toMatch(/\sstroke=/);
    expect(declarationsOf(`${prefix}:where(svg[fill='currentColor'] [fill='currentColor'])`).get('fill')).toBe(
      'currentColor',
    );
  });
});
