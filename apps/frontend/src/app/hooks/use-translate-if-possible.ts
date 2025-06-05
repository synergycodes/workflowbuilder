import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useTranslateIfPossible() {
  const { t, i18n } = useTranslation();

  const translateIfPossible = useCallback(
    (value = '') => {
      if (value && i18n.exists(value)) {
        return t(value) as string;
      }

      return;
    },
    [i18n, t],
  );

  return translateIfPossible;
}
