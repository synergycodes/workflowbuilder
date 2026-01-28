import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import { outputDirectory, sources } from '../config.json';
import { createIconEntry } from './create-icon-entry';

generateIcons();

export function generateIcons() {
  setupOutputDirectory();

  for (const path of sources) {
    execSync(`npx @svgr/cli --no-index --typescript --out-dir ${outputDirectory} -- ${path}`);
  }

  const keys = generateKeys();

  createIconEntry(keys);
}

function setupOutputDirectory() {
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory);
}

function generateKeys() {
  // Due to possible generation of 2 files with the same name, but different casing.
  // For case-sensitive file systems, we need to filter out the repeated keys.
  const keyLookup = new Set();
  const keys = [];

  for (const fileName of readdirSync(outputDirectory)) {
    const key = fileName.split('.tsx')[0];
    const lowerCaseKey = key.toLowerCase();

    // Remove existing files with the same name but different casing
    if (keyLookup.has(lowerCaseKey)) {
      console.warn(`Conflicting icon key found: ${fileName}. Removing`);
      const conflictingFilePath = path.join(outputDirectory, fileName);
      rmSync(conflictingFilePath);

      continue;
    }

    keys.push(key);
    keyLookup.add(lowerCaseKey);
  }

  return keys;
}
