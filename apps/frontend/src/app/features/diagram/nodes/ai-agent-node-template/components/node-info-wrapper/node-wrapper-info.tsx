import styles from './node-wrapper-info.module.css';
import { PropsWithChildren } from 'react';

export function NodeInfoWrapper({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <div className={styles['container']}>
      <span>{label}</span>
      {children}
    </div>
  );
}
