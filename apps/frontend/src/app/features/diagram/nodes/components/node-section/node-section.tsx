import { PropsWithChildren } from 'react';

import styles from './node-section.module.css';

type Props = PropsWithChildren<{ label: string }>;

export function NodeSection({ label, children }: Props) {
  return (
    <div className={styles['container']}>
      {label && <span>{label}</span>}
      {children}
    </div>
  );
}
