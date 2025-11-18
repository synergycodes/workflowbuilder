import styles from './palette-header.module.css';
import { NavButton } from '@synergycodes/overflow-ui';
import { Icon } from '@workflow-builder/icons';
import { useTranslation } from 'react-i18next';

type PaletteHeaderProps = {
  onClick: () => void;
  isSidebarExpanded: boolean;
};

export function PaletteHeader({ onClick, isSidebarExpanded }: PaletteHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className={styles['container']}>
      <span className="ax-public-h7">{t('palette.nodesLibrary')}</span>
      <NavButton
        size="small"
        onClick={onClick}
        tooltip={isSidebarExpanded ? t('tooltips.closePalette') : t('tooltips.openPalette')}
      >
        <Icon name="SidebarSimple" />
      </NavButton>
    </div>
  );
}
