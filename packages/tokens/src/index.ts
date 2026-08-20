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

assertNoValueCollisions(
  tokens,
  [...manifest.primitives, ...manifest.themes].map((entry) => entry.key),
);

ejectTokens(manifest);
await tokensToCss(manifest);
await generateCSSBundle(manifest);
