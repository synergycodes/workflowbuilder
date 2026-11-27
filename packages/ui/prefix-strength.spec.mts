import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import postcss, { type Rule } from 'postcss';

import { UI_SCOPE_PREFIX_OPTIONS } from './postcss-pipeline.mts';
import { scopePrefixPlugin } from './postcss-scope-prefix.mts';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(packageDirectory, 'src');

// Top-level selectors only: nested rules and keyframe steps are not prefixed on their own.
async function prefixedSelectors(file: string): Promise<string[]> {
  const result = await postcss([scopePrefixPlugin(UI_SCOPE_PREFIX_OPTIONS)]).process(fs.readFileSync(file, 'utf8'), {
    from: file,
  });
  const selectors: string[] = [];
  result.root.walkRules((rule: Rule) => {
    if (rule.parent?.type === 'rule') return;
    if (rule.parent?.type === 'atrule' && /keyframes|layer/.test(rule.parent.name)) return;
    if (rule.selector.startsWith(':root') || /^\[data-wb-theme[^\s]*$/.test(rule.selector)) return;
    selectors.push(rule.selector);
  });
  return selectors;
}

const UI_PREFIX = String.raw`:is(#\#, .workflow-builder-root) `;
const VENDORED_PREFIX = ':where(.workflow-builder-root) ';

describe('UI prefix strength on real files', () => {
  it('keeps every text role weightless behind the prefix, so any component rule overrides it', async () => {
    const selectors = await prefixedSelectors(path.join(sourceDirectory, 'styles/typography.css'));
    const roles = selectors
      .flatMap((list) => postcss.list.comma(list))
      .filter((selector) => selector.includes('wb-text-'));

    expect(roles.length).toBeGreaterThan(0);
    for (const selector of roles) expect(selector.trim().startsWith(`${UI_PREFIX}:where(`)).toBe(true);
  });

  it('makes the base button weightless behind the prefix', async () => {
    const file = path.join(sourceDirectory, 'components/button/base-button/base-button.module.css');
    const selectors = await prefixedSelectors(file);

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.startsWith(`${UI_PREFIX}:where(`)).toBe(true);
  });

  it('gives react-day-picker the vendored prefix', async () => {
    const file = createRequire(import.meta.url).resolve('react-day-picker/style.css');
    expect(UI_SCOPE_PREFIX_OPTIONS.vendoredFiles?.test(file)).toBe(true);

    const selectors = await prefixedSelectors(file);

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.startsWith(VENDORED_PREFIX)).toBe(true);
  });

  it('gives a component module full UI weight', async () => {
    const selectors = await prefixedSelectors(path.join(sourceDirectory, 'components/chip/chip.module.css'));

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector.startsWith(UI_PREFIX)).toBe(true);
      expect(selector.startsWith(`${UI_PREFIX}:where(`)).toBe(false);
    }
  });
});
