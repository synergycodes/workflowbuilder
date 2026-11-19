import moonIcon from '@iconify-icons/ph/moon';
import sunDimIcon from '@iconify-icons/ph/sun-dim';
import { SegmentPicker } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import appBarStyles from '../../app-bar.module.css';

import { useTheme } from '../../../../hooks/use-theme';
import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { Icon } from '../../../../icon/icon';

export function ToggleDarkMode({ className = appBarStyles['overflow-control'] }: { className?: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { setTheme } = useWorkflowBuilderActions();

  return (
    <SegmentPicker
      size="extra-small"
      variant="secondary"
      className={className}
      value={theme}
      onChange={(_event, value) => setTheme(value === 'dark' ? 'dark' : 'light')}
    >
      <SegmentPicker.Item
        value="light"
        aria-label={t('header.theme.light')}
        tooltip={t('header.theme.light')}
        prefixIcon={<Icon icon={sunDimIcon} size="inherit" />}
      />
      <SegmentPicker.Item
        value="dark"
        aria-label={t('header.theme.dark')}
        tooltip={t('header.theme.dark')}
        prefixIcon={<Icon icon={moonIcon} size="inherit" />}
      />
    </SegmentPicker>
  );
}
