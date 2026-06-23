import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary, { Config, TransformedToken } from 'style-dictionary';

import { config } from '../config';
import { OUTPUT_DIR, TOKEN_OUTPUT_DIR } from './constants';
import { toFileName } from './to-file-name';

const { primitives, themes } = config;

register(StyleDictionary);

export async function tokensToCss() {
  const primitiveSourceMap = createPrimitiveSourceMap();

  await processPrimitiveTokens(primitiveSourceMap);
  await processThemeTokens(primitiveSourceMap);
}

function createPrimitiveSourceMap(): Map<string, string> {
  const sourceMap = new Map();
  for (const tokenSet of primitives) {
    sourceMap.set(tokenSet, `${TOKEN_OUTPUT_DIR}${tokenSet}.json`);
  }

  return sourceMap;
}

async function processPrimitiveTokens(primitiveSourceMap: Map<string, string>): Promise<void> {
  for (const primitive of primitives) {
    const themeName = toFileName(primitive);
    const sourcePath = primitiveSourceMap.get(primitive);

    if (!sourcePath) {
      console.warn(`Source path not found for primitive: ${primitive}`);
      continue;
    }

    const source = [sourcePath];

    const config = createSDConfig({
      name: themeName,
      source,
    });

    const styleDictionary = new StyleDictionary(config);
    await styleDictionary.buildAllPlatforms();
  }
}

async function processThemeTokens(primitiveSourceMap: Map<string, string>): Promise<void> {
  for (const { name, selector } of themes) {
    const themeName = toFileName(name);
    const primitiveSources = [...primitiveSourceMap.values()];
    const source = [...primitiveSources, `${TOKEN_OUTPUT_DIR}${name}.json`];

    const config = createSDConfig({
      name: themeName,
      source,
      selector,
      filter: (token) => !primitives.some((primitive) => token.filePath.includes(primitive)),
    });

    const styleDictionary = new StyleDictionary(config);
    await styleDictionary.buildAllPlatforms();
  }
}

function createSDConfig({ name, selector, source, filter }: SDConfigParams) {
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
            destination: `${name}.css`,
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
  name: string;
  source: string[];
  selector?: string;
  filter?: (token: TransformedToken) => boolean;
};

const logOptions = {
  warnings: 'disabled', // 'warn' | 'error' | 'disabled'
  verbosity: 'verbose', // 'default' | 'silent' | 'verbose'
  errors: {
    brokenReferences: 'console', // 'throw' | 'console'
  },
} satisfies Config['log'];
