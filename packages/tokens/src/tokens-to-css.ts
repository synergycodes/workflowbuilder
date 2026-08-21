import { register } from '@tokens-studio/sd-transforms';
import path from 'node:path';
import StyleDictionary, { Config, TransformedToken } from 'style-dictionary';

import { OUTPUT_DIR } from './constants';
import { Manifest, TokenSetEntry } from './types';

register(StyleDictionary);

StyleDictionary.registerTransform({
  name: 'wb/font-size-rem',
  type: 'value',
  filter: (token) => token.path[1] === 'font-size',
  transform: (token) => {
    const value = String(token.value);
    const match = /^(-?[\d.]+)px$/.exec(value);
    if (!match) {
      throw new Error(
        `wb/font-size-rem expected '${token.path.join('/')}' to use px, received ${JSON.stringify(value)}`,
      );
    }
    return `${Number.parseFloat(match[1]) / 16}rem`;
  },
});

StyleDictionary.registerTransform({
  name: 'wb/dimension-rem',
  type: 'value',
  filter: (token) => ['space', 'radius', 'size'].includes(token.path[1]),
  transform: (token) => {
    const value = String(token.value);
    const match = /^(-?[\d.]+)px$/.exec(value);
    if (!match) {
      throw new Error(
        `wb/dimension-rem expected '${token.path.join('/')}' to use px, received ${JSON.stringify(value)}`,
      );
    }
    return `${Number.parseFloat(match[1]) / 16}rem`;
  },
});

export async function tokensToCss(manifest: Manifest) {
  await processPrimitiveTokens(manifest.primitives);
  await processThemeTokens(manifest);
}

async function processPrimitiveTokens(primitives: TokenSetEntry[]): Promise<void> {
  for (const primitive of primitives) {
    const config = createSDConfig({
      fileName: primitive.fileName,
      source: [primitive.jsonPath],
    });

    const styleDictionary = new StyleDictionary(config);
    await styleDictionary.buildAllPlatforms();
  }
}

async function processThemeTokens({ primitives, themes }: Manifest): Promise<void> {
  const primitiveSources = primitives.map((primitive) => primitive.jsonPath);

  for (const theme of themes) {
    const config = createSDConfig({
      fileName: theme.fileName,
      source: [...primitiveSources, theme.jsonPath],
      selector: theme.selector,
      // Compare the source file's basename, not a substring of the whole path:
      // a set whose kebab name happens to appear in the directory prefix
      // (e.g. a set named 'Tokens' vs ./dist/tokens/) must not match.
      filter: (token) =>
        !primitives.some((primitive) => path.basename(token.filePath) === `${primitive.fileName}.json`),
    });

    const styleDictionary = new StyleDictionary(config);
    await styleDictionary.buildAllPlatforms();
  }
}

function createSDConfig({ fileName, selector, source, filter }: SDConfigParams) {
  return {
    source,
    preprocessors: ['tokens-studio'],
    platforms: {
      css: {
        transformGroup: 'tokens-studio',
        transforms: ['name/kebab', 'wb/font-size-rem', 'wb/dimension-rem'],
        buildPath: OUTPUT_DIR,
        options: {
          outputReferences: true,
          selector,
        },
        files: [
          {
            destination: `${fileName}.css`,
            filter,
            format: 'css/variables',
          },
        ],
      },
    },
    log: logOptions,
  } as Config;
}

type SDConfigParams = {
  fileName: string;
  source: string[];
  selector?: string;
  filter?: (token: TransformedToken) => boolean;
};

const logOptions = {
  warnings: 'disabled', // 'warn' | 'error' | 'disabled'
  verbosity: 'verbose', // 'default' | 'silent' | 'verbose'
  errors: {
    // A dangling reference has no legitimate case - fail the build instead of
    // shipping CSS with literal `{token.path}` values the browser discards.
    brokenReferences: 'throw', // 'throw' | 'console'
  },
} satisfies Config['log'];
