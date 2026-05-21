import 'i18next';
import type { TFunction } from 'i18next';

import type { defaultNS } from '.';
import type { en } from './locales/en';

type PluginResources = {
  readonly translation: {
    readonly plugins: {
      readonly [pluginName: string]: {
        readonly [key: string]: string;
      };
    };
  };
};

type EnglishTranslationMap = typeof en;
type DefaultResources = { translation: EnglishTranslationMap };
type Resources = DefaultResources & PluginResources;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: Resources;
    returnNull: false;
    keySeparator: '.';
    nsSeparator: ':';
    strictKeyChecks: true;
  }
}

export type DefaultTranslationMap = DeepReplace<EnglishTranslationMap, string>;
type DeepReplace<T, LeafValue> = T extends object
  ? T extends readonly unknown[] | null
    ? LeafValue
    : {
        [K in keyof T]: DeepReplace<T[K], LeafValue>;
      }
  : LeafValue;

/**
 * Union of every valid translation key registered in the SDK's i18next
 * instance — built from the bundled English locale plus the structural
 * shape declared for plugin keys. Use it to type-check `t(...)` calls
 * inside SDK code and inside plugins that consume the SDK's i18n.
 *
 * @category i18n
 */
export type TranslationKey = Parameters<TFunction>[0] & string;
export type TranslationParams = Parameters<TFunction>[2];
