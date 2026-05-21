import styles from '../../app-bar.module.css';

import Logo from '../../../../assets/workflow-builder-logo.svg?react';
import { SaveButton } from '../../../integration/components/save-button/save-button';
import { OptionalAppBarTools } from '../../../plugins-core/components/app/optional-app-bar-toolbar';

export function Toolbar() {
  return (
    <div className={styles['toolbar']}>
      <Logo className={styles['logo']} />
      <div className={styles['nav-segment']}>
        <OptionalAppBarTools>
          <SaveButton />
        </OptionalAppBarTools>
      </div>
    </div>
  );
}
