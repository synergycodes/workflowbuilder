import styles from '../../app-bar.module.css';

import { OptionalAppBarControls } from '../../../plugins-core/components/app/optional-app-bar-controls';
import { CleanUpButton } from '../clean-up-button/clean-up-button';
import { MoreMenu } from '../more-menu/more-menu';
import { PublishButton } from '../publish-button/publish-button';
import { ToggleDarkMode } from '../toggle-dark-mode/toggle-dark-mode';
import { ToggleReadyOnlyMode } from '../toggle-read-only-mode/toggle-read-only-mode';

export function Controls() {
  return (
    <div className={styles['controls']}>
      <div className={styles['controls-segment']}>
        <OptionalAppBarControls>
          <CleanUpButton />
          <ToggleReadyOnlyMode />
          <ToggleDarkMode />
        </OptionalAppBarControls>
        <MoreMenu />
      </div>
      <PublishButton />
    </div>
  );
}
