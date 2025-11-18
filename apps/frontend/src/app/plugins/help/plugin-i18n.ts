import { registerPluginTranslation } from '@/features/plugins-core/adapters/adapter-i18n';

import * as translationEN from './locales/en/translation.json';
import * as translationPL from './locales/pl/translation.json';

registerPluginTranslation({
  en: {
    translation: translationEN,
  },
  pl: {
    translation: translationPL,
  },
});
