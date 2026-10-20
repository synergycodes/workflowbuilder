import { CaretDown, Network, TreeStructure } from '@phosphor-icons/react';
import { Menu, type MenuItemProps, NavButton } from '@workflowbuilder/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './clean-up-button.module.css';

import type { LayoutDirection } from '../../../../node/common';
import { useStore } from '../../../../store/store';
import { trackFutureChange } from '../../../changes-tracker/stores/use-changes-tracker-store';
import { useAppBar } from '../../app-bar-context';

export function CleanUpButton() {
  const { t } = useTranslation();
  const { onCleanUp } = useAppBar();
  const layoutDirection = useStore((state) => state.layoutDirection);
  const setLayoutDirection = useStore((state) => state.setLayoutDirection);
  const isEmptyCanvas = useStore((state) => state.nodes.length === 0);
  const isReadOnlyMode = useStore((state) => state.isReadOnlyMode);
  const [isPending, setIsPending] = useState<boolean>(false);

  if (!onCleanUp) {
    return null;
  }

  const cleanUp = (direction: LayoutDirection) => {
    if (isPending) {
      return;
    }

    const result = onCleanUp(direction);
    if (result instanceof Promise) {
      setIsPending(true);
      result.finally(() => setIsPending(false)).catch(() => {});
    }
  };

  const arrange = (direction: LayoutDirection) => {
    if (isPending) {
      return;
    }

    trackFutureChange('layoutDirection', { direction });
    setLayoutDirection(direction);
    cleanUp(direction);
  };

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

  const isDisabled = isEmptyCanvas || isReadOnlyMode;
  const label = t(layoutDirection === 'DOWN' ? 'header.cleanUp.vertical' : 'header.cleanUp.horizontal');

  return (
    <div className={styles['clean-up']}>
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
