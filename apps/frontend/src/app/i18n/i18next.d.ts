import 'i18next';
import { defaultNS } from '.';
import { en } from './locales/en';

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
