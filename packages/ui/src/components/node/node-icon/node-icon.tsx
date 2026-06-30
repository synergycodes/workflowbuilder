import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './node-icon.module.css';

type Props = {
  icon: ReactNode;
  className?: string;
};

export function NodeIcon({ icon, className }: Props) {
  return <div className={clsx(styles['container'], className)}>{icon}</div>;
}
