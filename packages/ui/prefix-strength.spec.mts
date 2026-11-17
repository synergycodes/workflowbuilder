import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import postcss, { type Rule } from 'postcss';

import { UI_SCOPE_PREFIX_OPTIONS } from './combine-css-bundle.mts';
import { scopePrefixPlugin } from './postcss-scope-prefix.mts';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(packageDirectory, 'src');

function cssFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(file);
    return entry.name.endsWith('.css') ? [file] : [];
  });
}

// Top-level selectors only: nested rules and keyframe steps are not prefixed on their own.
async function prefixedSelectors(file: string): Promise<string[]> {
  const result = await postcss([scopePrefixPlugin(UI_SCOPE_PREFIX_OPTIONS)]).process(fs.readFileSync(file, 'utf8'), {
    from: file,
  });
  const selectors: string[] = [];
  result.root.walkRules((rule: Rule) => {
    if (rule.parent?.type === 'rule') return;
    if (rule.parent?.type === 'atrule' && /keyframes|layer/.test(rule.parent.name)) return;
    if (rule.selector.startsWith(':root')) return;
    selectors.push(rule.selector);
  });
  return selectors;
}

const UI_PREFIX = ':is(#\\#, .workflow-builder-root) ';
const VENDORED_PREFIX = ':where(.workflow-builder-root) ';

describe('UI prefix strength on real files', () => {
  it('picks exactly the known base files by name', () => {
    const baseFiles = cssFiles(sourceDirectory)
      .filter((file) => UI_SCOPE_PREFIX_OPTIONS.baseFiles?.test(file))
      .map((file) => path.basename(file))
      .sort();

    expect(baseFiles).toEqual(['base-button.module.css', 'typography.css']);
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
