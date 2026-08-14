import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import tokens from '../tokens.json';
import { TOKEN_OUTPUT_DIR } from './constants';
import { Manifest } from './types';

export function ejectTokens({ primitives, themes }: Manifest): void {
  // No try/catch on purpose: this is a build step whose only product is correct
  // token JSON. A write failure must abort the build (non-zero exit) instead of
  // letting tokensToCss() run against missing/stale files and emit broken CSS.
  if (!existsSync(TOKEN_OUTPUT_DIR)) {
    mkdirSync(TOKEN_OUTPUT_DIR, { recursive: true });
  }

  for (const entry of [...primitives, ...themes]) {
    const tokenSet = (tokens as Record<string, unknown>)[entry.key];

    console.log(entry.jsonPath);
    writeFileSync(entry.jsonPath, JSON.stringify(tokenSet, null, 2), 'utf8');
  }
}
