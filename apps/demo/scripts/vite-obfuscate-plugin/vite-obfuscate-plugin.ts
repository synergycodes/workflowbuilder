import anymatch, { type Matcher } from 'anymatch';
import JSObfuscator, { type ObfuscatorOptions } from 'javascript-obfuscator';
import path from 'node:path';
import { type Plugin } from 'vite';

const defaultIncludeMatcher = [/\.(jsx?|tsx?|cjs|mjs)$/];
const defaultExcludeMatcher = [/node_modules/];

const shouldSkipLogForDirectories = ['node_modules', 'icons'];

type Options = {
  /**
   * (Array|String|RegExp|Function) String to be directly matched, string with glob patterns, regular expression test, function that takes the testString as an argument and returns a truthy value if it should be matched. default: ```[/\.(jsx?|tsx?|cjs|mjs)$/]```
   * [See more](https://github.com/micromatch/anymatch)
   */
  include?: Matcher;
  /**
   *  (Array|String|RegExp|Function) String to be directly matched, string with glob patterns, regular expression test, function that takes the testString as an argument and returns a truthy value if it should be matched. default: ```[/node_modules/, /\.nuxt/]```
   * [See more](https://github.com/micromatch/anymatch)
   */
  exclude?: Matcher;
  /**
   * Your javascript-obfuscator options
   * [See more options](https://github.com/javascript-obfuscator/javascript-obfuscator)
   */
  options?: ObfuscatorOptions;
  /**
   * Used for debugging, Print out the path of matching or excluding files
   */
  debugger?: boolean;
  /**
   * By default plugins are invoked for both serve and build. In cases where a plugin needs to be conditionally applied only during serve or build
   * https://vitejs.dev/guide/api-plugin.html
   */
  apply?: 'serve' | 'build' | ((this: void, config: unknown, env: unknown) => boolean);
};

type UnArray<T> = T extends unknown[] ? never : T;

type AnymatchPattern = UnArray<Matcher>;

function handleMatcher(matcher: Matcher): Matcher {
  const matcherArray = Array.isArray(matcher) ? matcher : [matcher];

  return matcherArray.map((matcher: AnymatchPattern): AnymatchPattern => {
    if (typeof matcher !== 'string') {
      return matcher;
    }
    return path.resolve('.', matcher).replaceAll('\\', '/');
  });
}

export function viteObfuscatePlugin(obOptions: Options = {}): Plugin {
  const { include, exclude, options }: Options = obOptions;

  const consoleLog = obOptions?.debugger
    ? (message: string, source?: string) => {
        const shouldBlock = shouldSkipLogForDirectories.some((directory) => source?.includes(directory));
        if (shouldBlock) {
          return;
        }

        console.log(message);
      }
    : () => {};

  const includeMatcher = include ? handleMatcher(include) : defaultIncludeMatcher;

  const excludeMatcher = exclude ? handleMatcher(exclude) : defaultExcludeMatcher;

  return {
    name: 'vite-obfuscate-plugin',
    enforce: 'post' as const,
    apply: obOptions?.apply || (() => false),
    transform(source: string, id: string) {
      if (anymatch(excludeMatcher, id, { dot: true })) {
        consoleLog(`[OBFUSCATOR] exclude: ${id}`, id);

        return;
      }

      if (anymatch(includeMatcher, id, { dot: true })) {
        consoleLog(`[OBFUSCATOR] include: ${id}`, id);

        const obfuscationResult = JSObfuscator.obfuscate(source, options);

        const result = { code: obfuscationResult.getObfuscatedCode() } as {
          map: string;
          code: string;
        };

        if (options?.sourceMap && options?.sourceMapMode !== 'inline') {
          result.map = obfuscationResult.getSourceMap();
        }
        return result;
      }

      consoleLog(`[OBFUSCATOR] not matched: ${id}`, id);
    },
  };
}

type ObfuscationConfig = Parameters<typeof viteObfuscatePlugin>[0];

export enum ObfuscationLevel {
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  HEAVY = 'HEAVY',
}

const OBFUSCATE_CONFIG_BASE = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  renameGlobals: false,
  splitStrings: true,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: 'function',
  unicodeEscapeSequence: false,
  sourceMap: false,
  simplify: true,
} as const;

const LIGHT_CONFIG = {
  ...OBFUSCATE_CONFIG_BASE,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  numbersToExpressions: false,
  selfDefending: false,
  splitStrings: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['rc4'],
  stringArrayWrappersCount: 3,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayThreshold: 0.9,
} as ObfuscationConfig;

const MEDIUM_CONFIG = {
  ...OBFUSCATE_CONFIG_BASE,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  disableConsoleOutput: true,
  numbersToExpressions: true,
  selfDefending: true,
  splitStringsChunkLength: 5,
  stringArrayEncoding: ['rc4'],
  stringArrayWrappersCount: 2,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
} as ObfuscationConfig;

const HEAVY_CONFIG = {
  ...OBFUSCATE_CONFIG_BASE,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.9,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.6,
  debugProtection: false,
  disableConsoleOutput: true,
  rotateStringArray: true,
  selfDefending: true,
  splitStringsChunkLength: 5,
  stringArrayEncoding: ['rc4'],
  stringArrayWrappersCount: 3,
  stringArrayThreshold: 1,
  transformObjectKeys: true,
  numbersToExpressions: true,
} as ObfuscationConfig;

export const getObfuscationConfig = (level: ObfuscationLevel): ObfuscationConfig => {
  switch (level) {
    case ObfuscationLevel.LIGHT: {
      return LIGHT_CONFIG;
    }
    case ObfuscationLevel.MEDIUM: {
      return MEDIUM_CONFIG;
    }
    case ObfuscationLevel.HEAVY: {
      return HEAVY_CONFIG;
    }
    default: {
      throw new Error(`Invalid obfuscation level: ${level}`);
    }
  }
};
