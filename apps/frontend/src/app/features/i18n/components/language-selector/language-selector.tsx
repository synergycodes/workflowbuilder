import { CaretDown } from '@phosphor-icons/react';
import { Menu, MenuItemProps, NavButton } from '@synergycodes/overflow-ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './language-selector.module.css';

type Language = {
  code: string;
  label: string;
};

const languages: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
];

export function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const languageItems: MenuItemProps[] = useMemo(
    () =>
      languages.map(({ code, label }) => ({
        label,
        icon: <Icon name="FlagBanner" />,
        onClick: () => i18n.changeLanguage(code),
      })),
    [i18n],
  );

  return (
    <>
      <Menu items={languageItems} size="small">
        <NavButton tooltip={t('tooltips.changeLanguage')}>
          <>
            <span className={styles['title']}>{currentLanguage.code.toUpperCase()}</span>
            <CaretDown />
          </>
        </NavButton>
      </Menu>
    </>
  );
}
