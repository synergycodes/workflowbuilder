import { CaretDown } from '@phosphor-icons/react';
import { Menu, type MenuItemProps, NavButton } from '@workflowbuilder/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { SUPPORTED_LANGUAGES, type WorkflowBuilderLanguage } from '../../../../hooks/use-workflow-builder-state';

const LANGUAGE_LABELS: Record<WorkflowBuilderLanguage, string> = {
  en: 'English',
  pl: 'Polski',
};

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useWorkflowBuilderActions();

  const resolvedCode = i18n.resolvedLanguage ?? i18n.language?.split('-')[0];
  const currentCode = SUPPORTED_LANGUAGES.find((code) => code === resolvedCode) ?? SUPPORTED_LANGUAGES[0];
  const visibleCode = currentCode.toUpperCase();

  const languageItems: MenuItemProps[] = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((code) => ({
        label: LANGUAGE_LABELS[code],
        icon: <Icon name="FlagBanner" />,
        selected: code === currentCode,
        onClick: () => setLanguage(code),
      })),
    [currentCode, setLanguage],
  );

  return (
    <>
      <Menu items={languageItems} size="small">
        <NavButton
          aria-label={`${visibleCode} - ${t('tooltips.changeLanguage')}`}
          suffixIcon={<CaretDown />}
          tooltip={t('tooltips.changeLanguage')}
        >
          {visibleCode}
        </NavButton>
      </Menu>
    </>
  );
}
