import { writeFileSync } from 'node:fs';
import { outputDirectory } from '../config.json';

const REACT_IMPORT_CODE = "import React from 'react';";

export async function createIconEntry(keys: string[]) {
  const iconTypesCode = `export type WBIcon = ${keys.map((name) => `'${name}'`).join(' | ')};`;

  const importMapCode = `export const iconMap = {
  ${keys.map((key) => `${key}: React.lazy(() => import('./${key}')),`).join('\n')}
};`;

  const entryFileCode = [REACT_IMPORT_CODE, iconTypesCode, importMapCode].join('\n');

  writeFileSync(`${outputDirectory}/index.ts`, entryFileCode);
}
