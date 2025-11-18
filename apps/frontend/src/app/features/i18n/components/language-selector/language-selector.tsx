import styles from './language-selector.module.css';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDown } from '@phosphor-icons/react';
import { MenuItemProps, Menu, NavButton } from '@synergycodes/overflow-ui';
import { Icon } from '@workflow-builder/icons';

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
