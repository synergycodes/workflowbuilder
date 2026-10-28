import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const TYPOGRAPHY_PATH = path.join(import.meta.dirname, 'src/styles/typography.css');

function readCss(file: string) {
  return postcss.parse(readFileSync(file, 'utf8'), { from: file });
}

describe('global typography compositions', () => {
  it('resolves every global composition to a typography class', () => {
    const definedClasses = new Set<string>();
    readCss(TYPOGRAPHY_PATH).walkRules((rule) => {
      for (const match of rule.selector.matchAll(/\.(wb-text-[\w-]+)\b/g)) {
        definedClasses.add(match[1]);
      }
    });

    const missing: string[] = [];
    const moduleFiles = globSync(['packages/*/src/**/*.module.css', 'apps/*/src/**/*.module.css'], {
      cwd: REPO_ROOT,
    });

    for (const relativeFile of moduleFiles) {
      const absoluteFile = path.join(REPO_ROOT, relativeFile);
      readCss(absoluteFile).walkDecls('composes', (declaration) => {
        const composition = declaration.value.match(/^(.+?)\s+from\s+global$/);
        if (!composition) return;

        for (const target of composition[1].trim().split(/\s+/)) {
          if (!definedClasses.has(target)) {
            missing.push(`${relativeFile}: ${target}`);
          }
        }
      });
    }

    expect(missing, `Missing global typography targets:\n${missing.join('\n')}`).toEqual([]);
  });
});
