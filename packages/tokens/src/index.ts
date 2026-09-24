import fs from 'node:fs';

import { tokensToCss } from './tokens-to-css';

import tokens from '../tokens.json';
import { OUTPUT_DIR } from './constants';
import { ejectTokens } from './eject-tokens';
import { generateCSSBundle } from './generate-css-bundle';
import { buildManifest } from './manifest';
import { assertNoValueCollisions } from './validate-collisions';

// Stale outputs must not survive a rebuild: a renamed set leaves its old file
// behind, and an incremental UI build would ship it as if it were current.
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });

const manifest = buildManifest();
const configuredSets = [
  ...manifest.primitives.map(({ key }) => ({ key, selector: ':root' })),
  ...manifest.themes.map(({ key, selector }) => ({ key, selector })),
];
const setKeysBySelector = new Map<string, string[]>();
for (const { key, selector } of configuredSets) {
  setKeysBySelector.set(selector, [...(setKeysBySelector.get(selector) ?? []), key]);
}

assertNoValueCollisions(
  tokens,
  configuredSets.map((entry) => entry.key),
  [...setKeysBySelector.values()],
);

ejectTokens(manifest);
await tokensToCss(manifest);
await generateCSSBundle(manifest);
