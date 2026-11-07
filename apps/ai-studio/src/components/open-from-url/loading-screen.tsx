import clsx from 'clsx';

import styles from './full-page.module.css';

export function LoadingScreen() {
  return (
    <div className="workflow-builder-root" data-wb-theme="light">
      <div className={clsx(styles['screen'], 'wb-text-headline-s')} role="status">
        Loading...
      </div>
    </div>
  );
}
