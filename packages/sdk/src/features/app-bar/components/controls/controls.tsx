import { DotsThreeVertical } from '@phosphor-icons/react';
import { Menu, type MenuItemProps } from '@workflowbuilder/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../../app-bar.module.css';

import { LanguageSelector } from '../../../i18n/components/language-selector/language-selector';
import { OptionalAppBarControls } from '../../../plugins-core/components/app/optional-app-bar-controls';
import { AreaTarget } from '../../../ui-extensions/area-target';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { composeMenuItems } from '../../../ui-extensions/compose-menu-items';
import { useRegisteredMenuItems } from '../../../ui-extensions/ui-extension-context';
import { getControlsDotsItems } from '../../functions/get-controls-dots-items';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';
import { ToggleReadyOnlyMode } from '../toggle-read-only-mode/toggle-read-only-mode';

// Reads the registered items apart from `Controls`, which renders the deprecated slot's decorators:
// a decorator that renders an `AppBarMenuItem` would otherwise re-render on its own registration.
function AppBarMenu() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isExportVisible = useIsBuiltInControlVisible('export');
  const isImportVisible = useIsBuiltInControlVisible('import');
  const registeredItems = useRegisteredMenuItems('appBar');

  // `t` isn't read in the body, but its identity changing on language change is the only
  // signal that the translated labels `getControlsDotsItems` returns need recomputing.
  const items: MenuItemProps[] = useMemo(
    () => composeMenuItems(getControlsDotsItems({ export: isExportVisible, import: isImportVisible }), registeredItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, isExportVisible, isImportVisible, registeredItems],
  );

  if (items.length === 0) return null;

  return (
    <div className={styles['menu-container']}>
      <Menu items={items} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Menu.TriggerButton aria-label={t('tooltips.menu')} tooltip={t('tooltips.menu')}>
          <DotsThreeVertical />
        </Menu.TriggerButton>
      </Menu>
    </div>
  );
}

export function Controls() {
  const isLanguageSelectorVisible = useIsBuiltInControlVisible('languageSelector');
  const isReadOnlyToggleVisible = useIsBuiltInControlVisible('readOnlyToggle');
  const isThemeToggleVisible = useIsBuiltInControlVisible('themeToggle');

  return (
    <div className={styles['controls']}>
      <AreaTarget area="appBarControls" />
      <OptionalAppBarControls>
        {isLanguageSelectorVisible && <LanguageSelector />}
        {isReadOnlyToggleVisible && <ToggleReadyOnlyMode />}
        {isThemeToggleVisible && <ToggleDarkMode />}
      </OptionalAppBarControls>
      <AppBarMenu />
    </div>
  );
}
