import styles from '../../app-bar.module.css';

import { LanguageSelector } from '../../../i18n/components/language-selector/language-selector';
import { AreaTarget } from '../../../ui-extensions/area-target';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { CleanUpButton } from '../clean-up-button/clean-up-button';
import { MoreMenu } from '../more-menu/more-menu';
import { PublishButton } from '../publish-button/publish-button';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';
import { ToggleReadyOnlyMode } from '../toggle-read-only-mode/toggle-read-only-mode';

export function Controls() {
  const isLanguageSelectorVisible = useIsBuiltInControlVisible('languageSelector');
  const isReadOnlyToggleVisible = useIsBuiltInControlVisible('readOnlyToggle');
  const isThemeToggleVisible = useIsBuiltInControlVisible('themeToggle');

  return (
    <div className={styles['controls']}>
      <div className={styles['controls-segment']}>
        <AreaTarget area="appBarControls" />
        {isLanguageSelectorVisible && <LanguageSelector />}
        <CleanUpButton />
        {isReadOnlyToggleVisible && <ToggleReadyOnlyMode />}
        {isThemeToggleVisible && <ToggleDarkMode />}
        <AreaTarget area="appBarControls" place="after" />
        <MoreMenu />
      </div>
      <PublishButton />
    </div>
  );
}
