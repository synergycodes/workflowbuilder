import styles from '../../app-bar.module.css';
import { useTranslation } from 'react-i18next';
import { NavButton, Menu, MenuItemProps } from '@synergycodes/overflow-ui';
import { DotsThreeVertical } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { getControlsDotsItems } from '../../functions/get-controls-dots-items';
import { OptionalAppBarControls } from '@/features/plugins-core/components/optional-app-bar-controls';
import { ToggleReadyOnlyMode } from '../toggle-read-only-mode/toggle-read-only-mode';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';

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
