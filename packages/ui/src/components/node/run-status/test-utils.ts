import { readFileSync } from 'node:fs';
import path from 'node:path';

import postcss from 'postcss';

const paletteFile = path.join(import.meta.dirname, 'variables.css');
const palette = new Map<string, string>();
postcss.parse(readFileSync(paletteFile, 'utf8'), { from: paletteFile }).walkDecls((declaration) => {
  palette.set(declaration.prop, declaration.value);
});

export function throughPalette(value = '') {
  const name = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return (name && palette.get(name)) ?? value;
}
