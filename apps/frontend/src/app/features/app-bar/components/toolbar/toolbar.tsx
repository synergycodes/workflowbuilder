import styles from '../../app-bar.module.css';
import Logo from '../../../../../assets/workflow-builder-logo.svg?react';

import { OptionalAppBarTools } from '@/features/plugins-core/components/optional-app-bar-toolbar';
import { SaveButton } from '@/features/integration/components/save-button/save-button';

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
