import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useDetectLanguageChange() {
  const { i18n } = useTranslation();

  useEffect(() => {
    function handleLanguageChange(language: string) {
      document.documentElement.lang = language;
    }

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
}
