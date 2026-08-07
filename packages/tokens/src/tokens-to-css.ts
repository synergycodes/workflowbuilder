import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary, { Config, TransformedToken } from 'style-dictionary';

import { OUTPUT_DIR } from './constants';
import { Manifest, TokenSetEntry } from './types';

register(StyleDictionary);

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
      filter: (token) => !primitives.some((primitive) => token.filePath.includes(primitive.fileName)),
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
        transforms: ['name/kebab'],
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
