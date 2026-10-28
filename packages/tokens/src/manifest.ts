import { config as defaultConfig } from '../config';
import tokens from '../tokens.json';
import { OUTPUT_DIR, TOKEN_OUTPUT_DIR } from './constants';
import { toFileName } from './to-file-name';
import { Config, Manifest, TokenSetEntry } from './types';

/**
 * The single place where token-set names become file paths.
 *
 * Validates the config against the tokens.json exports up front, so a renamed
 * Figma set or a config typo fails the build immediately with the available
 * keys listed - instead of surfacing later as a missing file or an empty
 * theme. Every pipeline step consumes the returned entries; none re-derives
 * a path on its own.
 */
export function buildManifest(
  exportedKeys: string[] = Object.keys(tokens),
  { primitives, themes }: Config = defaultConfig,
): Manifest {
  const exportedSets = new Set(exportedKeys.filter((key) => !key.startsWith('$')));

  const requested = [...primitives, ...themes.map((theme) => theme.set)];

  const missing = requested.filter((key) => !exportedSets.has(key));
  if (missing.length > 0) {
    throw new Error(
      `config.ts references ${missing.map((key) => `'${key}'`).join(', ')} ` +
        `but tokens.json exports: ${[...exportedSets].join(', ')}`,
    );
  }

  // A set listed twice (or in both groups) would make two builds race for the
  // same output file - the second silently overwrites the first.
  const duplicates = requested.filter((key, index) => requested.indexOf(key) !== index);
  if (duplicates.length > 0) {
    throw new Error(`config.ts lists ${[...new Set(duplicates)].map((key) => `'${key}'`).join(', ')} more than once`);
  }

  // Distinct keys can still normalize to the same file name ('Tokens Dark'
  // and 'Tokens/Dark' both become tokens-dark) - the same silent-overwrite
  // race, one step later.
  const keysByFileName = new Map<string, string[]>();
  for (const key of requested) {
    const fileName = toFileName(key);
    keysByFileName.set(fileName, [...(keysByFileName.get(fileName) ?? []), key]);
  }
  const collisions = [...keysByFileName.entries()].filter(([, keys]) => keys.length > 1);
  if (collisions.length > 0) {
    throw new Error(
      collisions
        .map(([fileName, keys]) => `${keys.map((key) => `'${key}'`).join(' and ')} both resolve to '${fileName}'`)
        .join('; '),
    );
  }

  return {
    primitives: primitives.map(entryFor),
    themes: themes.map((theme) => ({ ...entryFor(theme.set), selector: theme.selector })),
  };
}

function entryFor(key: string): TokenSetEntry {
  const fileName = toFileName(key);

  return {
    key,
    fileName,
    jsonPath: `${TOKEN_OUTPUT_DIR}${fileName}.json`,
    cssPath: `${OUTPUT_DIR}${fileName}.css`,
  };
}
