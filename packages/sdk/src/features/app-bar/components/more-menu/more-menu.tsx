import { Check, DotsThreeVertical, Moon, Network, SunDim, TreeStructure } from '@phosphor-icons/react';
import { Menu, type MenuItemProps } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import styles from '../../app-bar.module.css';

import { useTheme } from '../../../../hooks/use-theme';
import { useCleanUp } from '../clean-up-button/use-clean-up';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';

export function MoreMenu() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { isAvailable, layoutDirection, isPending, isDisabled, cleanUp, arrange } = useCleanUp();
  const disabled = isDisabled || isPending;
  const alignedIcon = <Check aria-hidden visibility="hidden" />;

  const items: MenuItemProps[] = isAvailable
    ? [
        {
          label: t('header.cleanUp.diagram'),
          icon: layoutDirection === 'DOWN' ? <Network /> : <TreeStructure />,
          disabled,
          onClick: () => cleanUp(layoutDirection),
        },
        {
          label: t('header.cleanUp.arrangeHorizontally'),
          icon: alignedIcon,
          selected: layoutDirection === 'RIGHT',
          disabled,
          onClick: () => arrange('RIGHT'),
        },
        {
          label: t('header.cleanUp.arrangeVertically'),
          icon: alignedIcon,
          selected: layoutDirection === 'DOWN',
          disabled,
          onClick: () => arrange('DOWN'),
        },
        { type: 'separator' },
      ]
    : [
        {
          label: t('header.theme.light'),
          icon: <SunDim />,
          selected: theme === 'light',
          onClick: () => theme !== 'light' && toggleTheme(),
        },
        {
          label: t('header.theme.dark'),
          icon: <Moon />,
          selected: theme === 'dark',
          onClick: () => theme !== 'dark' && toggleTheme(),
        },
      ];

  return (
    <div className={styles['more-menu']}>
      <Menu items={items} footer={isAvailable ? <ToggleDarkMode className={styles['full-width-picker']} /> : undefined}>
        <Menu.TriggerButton size="xs" aria-label={t('tooltips.menu')} tooltip={t('tooltips.menu')}>
          <DotsThreeVertical />
        </Menu.TriggerButton>
      </Menu>
    </div>
  );
}
