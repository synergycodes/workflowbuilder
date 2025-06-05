import { useTranslation } from 'react-i18next';
import { CaretDown } from '@phosphor-icons/react';
import { MenuItemProps, Menu, NavButton } from '@synergycodes/axiom';
import { useMemo } from 'react';
import styles from '../app-bar/app-bar.module.css';

interface Language {
  code: string;
  label: string;
}

const languages: Language[] = [
  { code: 'en', label: '🇬🇧' },
  { code: 'pl', label: '🇵🇱' },
];

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const languageItems: MenuItemProps[] = useMemo(
    () =>
      languages.map(({ code, label }) => ({
        label,
        onClick: () => i18n.changeLanguage(code),
      })),
    [i18n],
  );

  return (
    <>
      <span className={styles['title']}>{currentLanguage.label}</span>
      <Menu items={languageItems} size="small">
        <NavButton tooltip={t('tooltips.changeLanguage')}>
          <CaretDown />
        </NavButton>
      </Menu>
    </>
  );
}
