import styles from '../../app-bar.module.css';

import { OptionalAppBarTools } from '@/features/plugins-core/components/app/optional-app-bar-toolbar';

import { SaveButton } from '@/features/integration/components/save-button/save-button';

import Logo from '../../../../../assets/workflow-builder-logo.svg?react';

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
