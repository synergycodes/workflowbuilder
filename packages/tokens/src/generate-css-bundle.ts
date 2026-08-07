import { readFile, writeFile } from 'node:fs/promises';

import { OUTPUT_DIR } from './constants';
import { Manifest } from './types';

/**
 * Composes `dist/tokens.css` as a fully self-contained stylesheet: primitives
 * and themes are inlined, never `@import`-ed. The file must survive being
 * copied out alone (public/ dirs, CDNs, constructed stylesheets ignore
 * `@import`) - a relative import would break silently there.
 */
export async function generateCSSBundle({ primitives, themes }: Manifest) {
  const sources = [...primitives, ...themes];
  const chunks = await Promise.all(sources.map(({ cssPath }) => readFile(cssPath, 'utf8')));

  return writeFile(`${OUTPUT_DIR}tokens.css`, chunks.join('\n'));
}
