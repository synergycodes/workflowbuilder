import checkIcon from '@iconify-icons/ph/check';
import dotsThreeVerticalIcon from '@iconify-icons/ph/dots-three-vertical';
import moonIcon from '@iconify-icons/ph/moon';
import networkIcon from '@iconify-icons/ph/network';
import sunDimIcon from '@iconify-icons/ph/sun-dim';
import treeStructureIcon from '@iconify-icons/ph/tree-structure';
import { Menu, type MenuItemProps } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import styles from '../../app-bar.module.css';

import { useTheme } from '../../../../hooks/use-theme';
import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { Icon } from '../../../../icon/icon';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { useCleanUp } from '../clean-up-button/use-clean-up';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';

export function MoreMenu() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { setTheme } = useWorkflowBuilderActions();
  const isThemeToggleVisible = useIsBuiltInControlVisible('themeToggle');
  const { isAvailable, layoutDirection, isPending, isDisabled, cleanUp } = useCleanUp();
  const disabled = isDisabled || isPending;
  const alignedIcon = <Icon icon={checkIcon} size="inherit" aria-hidden visibility="hidden" />;

  const items: MenuItemProps[] = isAvailable
    ? [
        {
          label: t('header.cleanUp.diagram'),
          icon:
            layoutDirection === 'DOWN' ? (
              <Icon icon={networkIcon} size="inherit" />
            ) : (
              <Icon icon={treeStructureIcon} size="inherit" />
            ),
          disabled,
          onClick: () => cleanUp(),
        },
        {
          label: t('header.cleanUp.arrangeHorizontally'),
          icon: alignedIcon,
          selected: layoutDirection === 'RIGHT',
          disabled,
          onClick: () => cleanUp('RIGHT'),
        },
        {
          label: t('header.cleanUp.arrangeVertically'),
          icon: alignedIcon,
          selected: layoutDirection === 'DOWN',
          disabled,
          onClick: () => cleanUp('DOWN'),
        },
        ...(isThemeToggleVisible ? [{ type: 'separator' as const }] : []),
      ]
    : isThemeToggleVisible
      ? [
          {
            label: t('header.theme.light'),
            icon: <Icon icon={sunDimIcon} size="inherit" />,
            selected: theme === 'light',
            onClick: () => setTheme('light'),
          },
          {
            label: t('header.theme.dark'),
            icon: <Icon icon={moonIcon} size="inherit" />,
            selected: theme === 'dark',
            onClick: () => setTheme('dark'),
          },
        ]
      : [];
  const footer =
    isAvailable && isThemeToggleVisible ? <ToggleDarkMode className={styles['full-width-picker']} /> : undefined;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles['more-menu']}>
      <Menu items={items} footer={footer}>
        <Menu.TriggerButton size="xs" aria-label={t('tooltips.menu')} tooltip={t('tooltips.menu')}>
          <Icon icon={dotsThreeVerticalIcon} size="inherit" />
        </Menu.TriggerButton>
      </Menu>
    </div>
  );
}
