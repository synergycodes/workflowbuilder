import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

import styles from './node-run-progress.module.css';

export type NodeRunProgressProps = {
  /** Filled part of the bar in percent; values outside 0-100 are clamped. */
  value: number;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;

/**
 * Progress bar along the bottom edge of the node header, for a running step that reports progress. Place it in
 * `NodePanel.Overlay`. Decorative (`aria-hidden`): the application announces the run status.
 */
export function NodeRunProgress({ value, className, ...rest }: NodeRunProgressProps) {
  const percent = Math.min(100, Math.max(0, value || 0));

  return (
    <span aria-hidden="true" {...rest} className={clsx(styles['progress'], className)}>
      <span className={styles['fill']} style={{ width: `${percent}%` }} />
    </span>
  );
}
