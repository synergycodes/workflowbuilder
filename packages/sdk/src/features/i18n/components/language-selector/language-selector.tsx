import { CaretDown } from '@phosphor-icons/react';
import { Menu, type MenuItemProps, NavButton } from '@workflowbuilder/ui';
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

  const resolvedCode = i18n.resolvedLanguage ?? i18n.language?.split('-')[0];
  const currentLanguage = languages.find((lang) => lang.code === resolvedCode) || languages[0];
  const visibleCode = currentLanguage.code.toUpperCase();

  const languageItems: MenuItemProps[] = useMemo(
    () =>
      languages.map(({ code, label }) => ({
        label,
        icon: <Icon name="FlagBanner" />,
        selected: code === currentLanguage.code,
        onClick: () => i18n.changeLanguage(code),
      })),
    [i18n, currentLanguage.code],
  );

  return (
    <>
      <Menu items={languageItems} size="small">
        <NavButton
          size="xs"
          className={styles['language-selector']}
          aria-label={`${visibleCode} - ${t('tooltips.changeLanguage')}`}
          tooltip={t('tooltips.changeLanguage')}
        >
          <span className={styles['label']}>
            {visibleCode}
            <CaretDown className={styles['caret']} />
          </span>
        </NavButton>
      </Menu>
    </>
  );
}
