import styles from './node-section.module.css';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ label: string }>;

export function NodeSection({ label, children }: Props) {
  return (
    <div className={styles['container']}>
      <span>{label}</span>
      {children}
    </div>
  );
}
