import { CaretDown, Network, TreeStructure } from '@phosphor-icons/react';
import { Menu, type MenuItemProps, NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import appBarStyles from '../../app-bar.module.css';
import styles from './clean-up-button.module.css';

import { useCleanUp } from './use-clean-up';

export function CleanUpButton() {
  const { t } = useTranslation();
  const { isAvailable, layoutDirection, isPending, isDisabled, cleanUp, arrange } = useCleanUp();

  if (!isAvailable) {
    return null;
  }

  const items: MenuItemProps[] = [
    {
      label: t('header.cleanUp.arrangeHorizontally'),
      selected: layoutDirection === 'RIGHT',
      onClick: () => arrange('RIGHT'),
    },
    {
      label: t('header.cleanUp.arrangeVertically'),
      selected: layoutDirection === 'DOWN',
      onClick: () => arrange('DOWN'),
    },
  ];

  const label = t(layoutDirection === 'DOWN' ? 'header.cleanUp.vertical' : 'header.cleanUp.horizontal');

  return (
    <div className={`${styles['clean-up']} ${appBarStyles['overflow-control']}`}>
      <NavButton
        size="xs"
        className={styles['main']}
        disabled={isDisabled}
        isSelected={isPending}
        aria-busy={isPending}
        aria-label={label}
        tooltip={label}
        prefixIcon={layoutDirection === 'DOWN' ? <Network /> : <TreeStructure />}
        onClick={() => cleanUp(layoutDirection)}
      />
      <Menu items={items}>
        <Menu.TriggerButton
          size="xxxs"
          className={styles['caret']}
          disabled={isDisabled || isPending}
          aria-label={t('header.cleanUp.chooseDirection')}
          tooltip={t('header.cleanUp.chooseDirection')}
        >
          <CaretDown />
        </Menu.TriggerButton>
      </Menu>
    </div>
  );
}
