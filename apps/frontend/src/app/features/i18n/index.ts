import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { pl } from './locales/pl';

import { withOptionalComponentPluginsTranslation } from '@/features/plugins-core/adapters/adapter-i18n';

const defaultNS = 'translation';

const resources = {
  en: {
    translation: en,
  } as const,
  pl: {
    translation: pl,
  } as const,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: withOptionalComponentPluginsTranslation(resources),
    defaultNS,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });
