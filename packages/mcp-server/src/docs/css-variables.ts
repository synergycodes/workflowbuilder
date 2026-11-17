import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

interface CssComponent {
  slug: string;
  dir?: string | null;
  cssSources?: readonly string[];
}

const PUBLIC_VARIABLE = /(--wb-public-[\w-]+)\s*:\s*([^;]*?)(?:\/\*\s*(.*?)\s*\*\/)?\s*;/g;
const INTERNAL_NOTE = /missing token/i;

function cssFilesUnder(directory: string, skippedPrefixes: readonly string[]) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll(String.fromCodePoint(92), '/'))
    .filter((file) => file.endsWith('.css') && !skippedPrefixes.some((prefix) => file.startsWith(prefix)))
    .sort()
    .map((file) => path.join(directory, file));
}

// Mirrors how apps/docs lists a component's `--wb-public-*` variables: the component folder minus nested documented components, plus extra sources.
export function readCssVariables(uiSourceRoot: string, component: CssComponent, all: readonly CssComponent[]) {
  if (!component.dir) return [];
  const directory = path.join(uiSourceRoot, 'components', component.dir);
  const prefix = `${component.dir}/`;
  const nested = all
    .map((other) => other.dir)
    .filter((folder): folder is string => typeof folder === 'string' && folder.startsWith(prefix))
    .map((folder) => `${folder.slice(prefix.length)}/`);
  const files = [
    ...cssFilesUnder(directory, nested),
    ...(component.cssSources ?? []).map((source) => path.join(uiSourceRoot, source)).filter((file) => existsSync(file)),
  ];
  const names = new Map<string, string>();
  for (const file of files) {
    for (const [, name, , comment = ''] of readFileSync(file, 'utf8').matchAll(PUBLIC_VARIABLE)) {
      if (!names.has(name)) names.set(name, INTERNAL_NOTE.test(comment) ? '' : comment.trim());
    }
  }
  return [...names].map(([name, comment]) => (comment ? `${name} (${comment})` : name));
}
