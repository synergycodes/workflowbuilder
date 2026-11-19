import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

import styles from './node-run-veil.module.css';

export type NodeRunVeilProps = HTMLAttributes<HTMLSpanElement>;

/**
 * Dims the whole node, for example a skipped step. Place it in `NodePanel.Overlay`.
 */
export function NodeRunVeil({ className, ...rest }: NodeRunVeilProps) {
  return <span {...rest} className={clsx(styles['veil'], className)} />;
}
