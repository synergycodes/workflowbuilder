import { DotsThreeVertical } from '@phosphor-icons/react';
import { Menu, MenuItemProps, NavButton } from '@synergycodes/overflow-ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../../app-bar.module.css';

import { OptionalAppBarControls } from '@/features/plugins-core/components/app/optional-app-bar-controls';

import { getControlsDotsItems } from '../../functions/get-controls-dots-items';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';
import { ToggleReadyOnlyMode } from '../toggle-read-only-mode/toggle-read-only-mode';

export function Controls() {
  const { t } = useTranslation();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items: MenuItemProps[] = useMemo(() => getControlsDotsItems(), [t]);

  return (
    <div className={styles['controls']}>
      <OptionalAppBarControls>
        <ToggleReadyOnlyMode />
        <ToggleDarkMode />
      </OptionalAppBarControls>
      {items.length > 0 && (
        <div className={styles['menu-container']}>
          <Menu items={items}>
            <NavButton tooltip={t('tooltips.menu')}>
              <DotsThreeVertical />
            </NavButton>
          </Menu>
        </div>
      )}
    </div>
  );
}
