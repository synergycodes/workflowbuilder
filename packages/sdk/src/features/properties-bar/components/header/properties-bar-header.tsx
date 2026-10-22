import { Menu, NavButton } from '@workflowbuilder/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './properties-bar-header.module.css';

import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { composeMenuItems } from '../../../ui-extensions/compose-menu-items';
import { useRegisteredMenuItems } from '../../../ui-extensions/ui-extension-context';

type Props = {
  header: string;
  name: string;
  hasSelection: boolean;
  isExpendable: boolean;
  /** Whether the panel currently shows its content, as opposed to its collapsed rail. */
  isExpanded: boolean;
  onTogglePropertiesBar: () => void;
  onDotsClick?: () => void;
};

export function PropertiesBarHeader({
  onTogglePropertiesBar,
  isExpendable: isPropertiesBarOpen,
  isExpanded,
  header,
  hasSelection,
  name,
  onDotsClick,
}: Props) {
  const { t } = useTranslation();
  const isPropertiesPanelToggleVisible = useIsBuiltInControlVisible('propertiesPanelToggle');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const registeredItems = useRegisteredMenuItems('propertiesPanel');
  const items = useMemo(() => composeMenuItems([], registeredItems), [registeredItems]);
  const menuLabel = t('tooltips.menu');

  return (
    <div className={styles['header']}>
      {isPropertiesPanelToggleVisible && (
        <NavButton
          aria-label={isPropertiesBarOpen ? t('tooltips.closePropertiesBar') : t('tooltips.openPropertiesBar')}
          size="s"
          onClick={onTogglePropertiesBar}
          tooltip={isPropertiesBarOpen ? t('tooltips.closePropertiesBar') : t('tooltips.openPropertiesBar')}
          disabled={!hasSelection}
          prefixIcon={<Icon name="SidebarSimple" />}
        />
      )}
      <div className={styles['text-container']}>
        <span className={name ? 'wb-text-title-s-emphasized' : 'wb-text-title-m-emphasized'}>{header}</span>
        {name && <p className="wb-text-label-s">{name}</p>}
      </div>
      {isExpanded && items.length > 0 && (
        <div className={styles['menu-container']}>
          <Menu items={items} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Menu.TriggerButton aria-label={menuLabel} tooltip={menuLabel} size="s">
              <Icon name="DotsThreeVertical" />
            </Menu.TriggerButton>
          </Menu>
        </div>
      )}
      {isExpanded && items.length === 0 && onDotsClick && (
        <NavButton
          aria-label={menuLabel}
          size="s"
          onClick={onDotsClick}
          prefixIcon={<Icon name="DotsThreeVertical" />}
        />
      )}
    </div>
  );
}
