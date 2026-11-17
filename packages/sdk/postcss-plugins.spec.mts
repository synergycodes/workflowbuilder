import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

import { sdkPostcssPlugins } from './postcss-plugins.mjs';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoDirectory = path.resolve(packageDirectory, '../..');

async function firstSelector(css: string, from: string): Promise<string> {
  const result = await postcss(sdkPostcssPlugins()).process(css, { from });
  let selector = '';
  result.root.walkRules((rule) => {
    if (!selector && rule.parent?.type !== 'rule') selector = rule.selector;
  });
  return selector;
}

describe('sdkPostcssPlugins on real paths', () => {
  it('gives an SDK module SDK weight', async () => {
    const file = path.join(packageDirectory, 'src/features/snackbar/snackbar-container.module.css');
    expect(fs.existsSync(file)).toBe(true);

    expect(await firstSelector('.x { color: red }', file)).toBe(
      ':is(#\\#, .workflow-builder-root).workflow-builder-root .x',
    );
  });

  it('gives the @xyflow stylesheet the vendored prefix', async () => {
    const file = createRequire(import.meta.url).resolve('@xyflow/react/dist/style.css');

    expect(await firstSelector('.react-flow { color: red }', file)).toBe(':where(.workflow-builder-root) .react-flow');
  });

  it('leaves the built UI CSS and app CSS untouched', async () => {
    for (const file of ['packages/ui/dist/index.css', 'apps/demo/src/app/app.css']) {
      expect(await firstSelector('.x { color: red }', path.join(repoDirectory, file))).toBe('.x');
    }
  });
});
