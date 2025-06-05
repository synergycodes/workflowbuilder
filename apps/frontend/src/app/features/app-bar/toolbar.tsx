import styles from './app-bar.module.css';
import Logo from '../../../assets/workflow-builder-logo.svg?react';
import { NavButton } from '@synergycodes/axiom';
import { Icon } from '@workflow-builder/icons';
import { useTranslation } from 'react-i18next';
interface ToolbarProps {
  onSave: () => void;
  onOpen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isReadOnlyMode: boolean;
}

export function Toolbar({ onSave, onOpen, onUndo, onRedo, canUndo, canRedo, isReadOnlyMode }: ToolbarProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'tooltips' });

  return (
    <div className={styles['toolbar']}>
      <Logo className={styles['logo']} />
      <div className={styles['nav-segment']}>
        <NavButton onClick={onSave} tooltip={t('save')}>
          <Icon name="FloppyDisk" />
        </NavButton>
        <NavButton onClick={onOpen} tooltip={t('open')}>
          <Icon name="FolderOpen" />
        </NavButton>
        <NavButton onClick={onUndo} disabled={!canUndo || isReadOnlyMode} tooltip={t('undo')}>
          <Icon name="ArrowUUpLeft" />
        </NavButton>
        <NavButton onClick={onRedo} disabled={!canRedo || isReadOnlyMode} tooltip={t('redo')}>
          <Icon name="ArrowUUpRight" />
        </NavButton>
      </div>
    </div>
  );
}
