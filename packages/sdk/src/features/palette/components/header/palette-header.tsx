import { NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './palette-header.module.css';

import { AreaTarget } from '../../../ui-extensions/area-target';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';

type PaletteHeaderProps = {
  onClick: () => void;
  isPaletteOpen: boolean;
};

export function PaletteHeader({ onClick, isPaletteOpen }: PaletteHeaderProps) {
  const { t } = useTranslation();
  const isPaletteToggleVisible = useIsBuiltInControlVisible('paletteToggle');

  return (
    <>
      <div className={styles['container']}>
        <span className="wb-text-title-m-emphasized">{t('palette.nodesLibrary')}</span>
        {isPaletteToggleVisible && (
          <NavButton
            aria-label={isPaletteOpen ? t('tooltips.closePalette') : t('tooltips.openPalette')}
            size="s"
            onClick={onClick}
            tooltip={isPaletteOpen ? t('tooltips.closePalette') : t('tooltips.openPalette')}
            prefixIcon={<Icon name="SidebarSimple" />}
          />
        )}
      </div>
      {isPaletteOpen && <AreaTarget area="paletteHeader" />}
    </>
  );
}
