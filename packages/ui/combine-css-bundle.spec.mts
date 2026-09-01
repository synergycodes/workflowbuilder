import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

import { finalizeCssBundle } from './combine-css-bundle.mts';

function fontFaces(css: string): string[] {
  const faces: string[] = [];
  postcss.parse(css).walkAtRules('font-face', (atRule) => {
    faces.push(atRule.toString());
  });
  return faces;
}

describe('combine CSS bundle', () => {
  it('copies every generated font face into the entry chunk', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wb-ui-css-'));

    try {
      mkdirSync(path.join(root, 'dist/assets'), { recursive: true });
      mkdirSync(path.join(root, 'src/styles'), { recursive: true });
      writeFileSync(
        path.join(root, 'dist/assets/index.css'),
        '@layer ui.component; @layer ui.component { .entry { color: black } }',
      );
      writeFileSync(path.join(root, 'src/styles/layers.css'), '@layer ui.base, ui.component;');
      writeFileSync(path.join(root, 'src/styles/globals.css'), '@layer ui.base { :root { --x: 1 } }');
      writeFileSync(path.join(root, 'src/styles/typography.css'), '@layer ui.base {}');

      finalizeCssBundle(root);

      const sidecar = readFileSync(path.join(root, 'dist/fonts.css'), 'utf8');
      const entryChunk = readFileSync(path.join(root, 'dist/assets/index.css'), 'utf8');
      const expectedFaces = fontFaces(sidecar).map((face) => face.replaceAll('url(./assets/', 'url(./'));
      expect(expectedFaces.length).toBeGreaterThan(0);
      expect(fontFaces(entryChunk)).toEqual(expectedFaces);
      expect(entryChunk).not.toContain('url(./assets/');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
