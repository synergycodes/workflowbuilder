import styles from './indicator-dot.module.css';
import { PropsWithChildren } from 'react';

export function IndicatorDot({ children }: PropsWithChildren) {
  return <div className={styles['with-indicator-dot']}>{children}</div>;
}
