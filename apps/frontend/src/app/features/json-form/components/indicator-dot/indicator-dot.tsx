import { PropsWithChildren } from 'react';

import styles from './indicator-dot.module.css';

export function IndicatorDot({ children }: PropsWithChildren) {
  return <div className={styles['with-indicator-dot']}>{children}</div>;
}
