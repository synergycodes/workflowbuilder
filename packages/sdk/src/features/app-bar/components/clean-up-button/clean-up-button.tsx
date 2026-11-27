import caretDownIcon from '@iconify-icons/ph/caret-down';
import networkIcon from '@iconify-icons/ph/network';
import treeStructureIcon from '@iconify-icons/ph/tree-structure';
import { Menu, type MenuItemProps, NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import appBarStyles from '../../app-bar.module.css';
import styles from './clean-up-button.module.css';

import { Icon } from '../../../../icon/icon';
import { useCleanUp } from './use-clean-up';

export function CleanUpButton() {
  const { t } = useTranslation();
  const { isAvailable, layoutDirection, isPending, isDisabled, cleanUp } = useCleanUp();

  if (!isAvailable) {
    return null;
  }

  const items: MenuItemProps[] = [
    {
      label: t('header.cleanUp.arrangeHorizontally'),
      selected: layoutDirection === 'RIGHT',
      onClick: () => cleanUp('RIGHT'),
    },
    {
      label: t('header.cleanUp.arrangeVertically'),
      selected: layoutDirection === 'DOWN',
      onClick: () => cleanUp('DOWN'),
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
        tooltip={label}
        prefixIcon={
          layoutDirection === 'DOWN' ? (
            <Icon icon={networkIcon} size="inherit" />
          ) : (
            <Icon icon={treeStructureIcon} size="inherit" />
          )
        }
        onClick={() => cleanUp()}
      />
      <Menu items={items}>
        <Menu.TriggerButton
          size="xxxs"
          className={styles['caret']}
          disabled={isDisabled || isPending}
          aria-label={t('header.cleanUp.chooseDirection')}
          tooltip={t('header.cleanUp.chooseDirection')}
        >
          <Icon icon={caretDownIcon} size="inherit" />
        </Menu.TriggerButton>
      </Menu>
    </div>
  );
}
