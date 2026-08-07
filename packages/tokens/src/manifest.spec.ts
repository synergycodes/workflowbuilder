import { describe, expect, it } from 'vitest';

import { buildManifest } from './manifest';

const exportedKeys = ['Primitives/Mode 1', 'Numerals/Mode 1', 'Tokens/Dark', '$themes', '$metadata'];

describe('buildManifest', () => {
  it('derives every path from the tokens.json key once', () => {
    const manifest = buildManifest(exportedKeys, {
      primitives: ['Primitives/Mode 1'],
      themes: [{ set: 'Tokens/Dark', selector: "html[data-theme='dark']" }],
    });

    expect(manifest.primitives).toEqual([
      {
        key: 'Primitives/Mode 1',
        fileName: 'primitives-mode-1',
        jsonPath: './dist/tokens/primitives-mode-1.json',
        cssPath: './dist/primitives-mode-1.css',
      },
    ]);
    expect(manifest.themes[0]).toMatchObject({
      fileName: 'tokens-dark',
      selector: "html[data-theme='dark']",
    });
  });

  it('rejects a config set that tokens.json does not export, listing what it does', () => {
    expect(() =>
      buildManifest(exportedKeys, {
        primitives: [],
        themes: [{ set: 'Tokens/Drak', selector: 'html' }],
      }),
    ).toThrowError(/'Tokens\/Drak'.+tokens\.json exports: Primitives\/Mode 1/);
  });

  it('rejects a set listed more than once, also across groups', () => {
    expect(() =>
      buildManifest(exportedKeys, {
        primitives: ['Primitives/Mode 1'],
        themes: [{ set: 'Primitives/Mode 1', selector: 'html' }],
      }),
    ).toThrowError(/'Primitives\/Mode 1'.+more than once/);
  });

  it('does not treat $-metadata keys as exported sets', () => {
    expect(() =>
      buildManifest(exportedKeys, {
        primitives: ['$themes'],
        themes: [],
      }),
    ).toThrowError(/'\$themes'/);
  });
});
