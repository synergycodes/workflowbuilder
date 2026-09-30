import clsx from 'clsx';

import styles from './full-page.module.css';

export function LoadingScreen() {
  return (
    <div className={clsx(styles['screen'], 'wb-text-headline-s')} role="status">
      Loading...
    </div>
  );
}
