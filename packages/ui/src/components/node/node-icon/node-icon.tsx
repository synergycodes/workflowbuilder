import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './node-icon.module.css';

export type NodeIconProps = {
  icon: ReactNode;
  /** Muted glyph and container of the Node Disabled variant. */
  disabled?: boolean;
  className?: string;
};

export function NodeIcon({ icon, disabled = false, className }: NodeIconProps) {
  return <div className={clsx(styles['container'], { [styles['disabled']]: disabled }, className)}>{icon}</div>;
}
