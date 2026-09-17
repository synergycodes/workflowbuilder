import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { copyUiFontAssets } from './font-assets.mjs';

describe('ui font assets', () => {
  const directories: string[] = [];

  function makeDirectory() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-sdk-font-assets-'));
    directories.push(directory);
    return directory;
  }

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('copies the font files and their licences, and nothing else', () => {
    const uiAssets = makeDirectory();
    for (const file of ['poppins-latin-400.woff2', 'inter-latin-400.woff2', 'OFL-poppins.txt', 'OFL-inter.txt']) {
      fs.writeFileSync(path.resolve(uiAssets, file), file);
    }
    fs.writeFileSync(path.resolve(uiAssets, 'index.js'), 'export {};');

    const copied = copyUiFontAssets(uiAssets, path.resolve(makeDirectory(), 'assets'));

    expect(copied.sort()).toEqual([
      'OFL-inter.txt',
      'OFL-poppins.txt',
      'inter-latin-400.woff2',
      'poppins-latin-400.woff2',
    ]);
  });

  it('writes the copies into a distribution directory that does not exist yet', () => {
    const uiAssets = makeDirectory();
    fs.writeFileSync(path.resolve(uiAssets, 'OFL-inter.txt'), 'SIL OPEN FONT LICENSE Version 1.1');
    const assetsDirectory = path.resolve(makeDirectory(), 'dist/assets');

    copyUiFontAssets(uiAssets, assetsDirectory);

    expect(fs.readFileSync(path.resolve(assetsDirectory, 'OFL-inter.txt'), 'utf8')).toContain(
      'SIL OPEN FONT LICENSE Version 1.1',
    );
  });
});
