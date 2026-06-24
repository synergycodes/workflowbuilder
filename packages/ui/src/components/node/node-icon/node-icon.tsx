import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './node-icon.module.css';

export type NodeIconProps = {
  icon: ReactNode;
  className?: string;
};

export function NodeIcon({ icon, className }: NodeIconProps) {
  return <div className={clsx(styles['container'], className)}>{icon}</div>;
}
