import styles from '../../app-bar.module.css';

import { OptionalAppBarControls } from '../../../plugins-core/components/app/optional-app-bar-controls';
import { CleanUpButton } from '../clean-up-button/clean-up-button';
import { PublishButton } from '../publish-button/publish-button';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';
import { ToggleReadyOnlyMode } from '../toggle-read-only-mode/toggle-read-only-mode';

export function Controls() {
  return (
    <div className={styles['controls']}>
      <OptionalAppBarControls>
        <CleanUpButton />
        <ToggleReadyOnlyMode />
        <ToggleDarkMode />
      </OptionalAppBarControls>
      <PublishButton />
    </div>
  );
}
