import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { emitFontAssets } from './combine-css-bundle.mts';

describe('font license assets', () => {
  const distributionDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-ui-font-licenses-'));

  beforeAll(() => {
    emitFontAssets(distributionDirectory);
  });

  afterAll(() => {
    fs.rmSync(distributionDirectory, { recursive: true, force: true });
  });

  it.each(['OFL-poppins.txt', 'OFL-inter.txt'])('emits %s with the font assets', (fileName) => {
    const license = fs.readFileSync(path.resolve(distributionDirectory, 'assets', fileName), 'utf8');

    expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });
});
