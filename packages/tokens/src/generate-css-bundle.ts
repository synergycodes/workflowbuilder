import { readFile, writeFile } from 'node:fs/promises';

import { config } from '../config';
import { Theme } from './types';

const { primitives, themes } = config;

export async function generateCSSBundle() {
  // Local to the call so repeated invocations in one process don't accumulate.
  const codeChunks: string[] = [];

  for (const primitive of primitives) {
    codeChunks.push(createPrimitiveImport(primitive));
  }

  for (const theme of themes) {
    codeChunks.push(await createThemeImport(theme));
  }

  const code = codeChunks.join('\n\n');

  return writeFile('./dist/tokens.css', code);
}

function createPrimitiveImport(name: string) {
  return `@import "./${name}.css";`;
}

async function createThemeImport({ name }: Theme) {
  const css = await readFile(`./dist/${name}.css`);
  return css.toString();
}
