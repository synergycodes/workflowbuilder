import { readFileSync } from 'node:fs';
import path from 'node:path';

import postcss from 'postcss';

const paletteFile = path.join(import.meta.dirname, 'variables.css');
const palette = new Map<string, string>();
postcss.parse(readFileSync(paletteFile, 'utf8'), { from: paletteFile }).walkDecls((declaration) => {
  palette.set(declaration.prop, declaration.value);
});

/** Resolves `var(--a, <fallback>)` the way the browser would against the run status palette. */
export function throughPalette(value = ''): string {
  const [, name, fallback] = /^var\((--[\w-]+)(?:,\s*(.+))?\)$/.exec(value) ?? [];
  if (!name) return value;
  return palette.get(name) ?? (fallback === undefined ? value : throughPalette(fallback));
}
