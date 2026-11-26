import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { TranslationKey } from '../features/i18n/i18next';

export function useTranslateIfPossible() {
  const { t, i18n } = useTranslation();

  const translateIfPossible = useCallback(
    (value = '') => {
      if (!value || !i18n.exists(value)) {
        return;
      }

      // Without `returnObjects`, a key naming a group of translations returns i18next's notice as a string.
      const translation: unknown = t(value as TranslationKey, { returnObjects: true });

      return typeof translation === 'string' ? translation : undefined;
    },
    [i18n, t],
  );

  return translateIfPossible;
}
