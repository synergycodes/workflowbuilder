import { NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './properties-bar-header.module.css';

type Props = {
  header: string;
  name: string;
  hasSelection: boolean;
  isExpendable: boolean;
  onTogglePropertiesBar: () => void;
  onDotsClick?: () => void;
};

export function PropertiesBarHeader({
  onTogglePropertiesBar,
  isExpendable: isPropertiesBarOpen,
  header,
  hasSelection,
  name,
  onDotsClick,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles['header']}>
      <NavButton
        aria-label={isPropertiesBarOpen ? t('tooltips.closePropertiesBar') : t('tooltips.openPropertiesBar')}
        size="s"
        onClick={onTogglePropertiesBar}
        tooltip={isPropertiesBarOpen ? t('tooltips.closePropertiesBar') : t('tooltips.openPropertiesBar')}
        disabled={!hasSelection}
        prefixIcon={<Icon name="SidebarSimple" />}
      />
      <div className={styles['text-container']}>
        <span className={name ? 'ax-public-h9' : 'ax-public-h7'}>{header}</span>
        {name && <p className="ax-public-p11">{name}</p>}
      </div>
      {onDotsClick && (
        <NavButton
          aria-label={t('tooltips.menu')}
          size="s"
          onClick={onDotsClick}
          prefixIcon={<Icon name="DotsThreeVertical" />}
        />
      )}
    </div>
  );
}
