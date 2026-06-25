import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import tokens from '../tokens.json';
import { TOKEN_OUTPUT_DIR } from './constants';
import { toFileName } from './to-file-name';

export function ejectTokens(): void {
  // No try/catch on purpose: this is a build step whose only product is correct
  // token JSON. A write failure must abort the build (non-zero exit) instead of
  // letting tokensToCss() run against missing/stale files and emit broken CSS.
  if (!existsSync(TOKEN_OUTPUT_DIR)) {
    mkdirSync(TOKEN_OUTPUT_DIR, { recursive: true });
  }

  // Filter out tokens metadata to get themes
  const themes = Object.entries(tokens).filter(([name]) => !name.startsWith('$'));

  for (const [name, theme] of themes) {
    const fileName = toFileName(name);

    const outputFilePath = path.join(TOKEN_OUTPUT_DIR, `${fileName}.json`);
    console.log(outputFilePath);

    // Write the property value to a new JSON file
    writeFileSync(outputFilePath, JSON.stringify(theme, null, 2), 'utf8');
  }
}
