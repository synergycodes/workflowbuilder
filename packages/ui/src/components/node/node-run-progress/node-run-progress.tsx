import clsx from 'clsx';

import styles from './node-run-progress.module.css';

export type NodeRunProgressProps = {
  /** Filled part of the bar in percent; values outside 0-100 are clamped. */
  value: number;
  className?: string;
};

/**
 * Progress bar along the bottom edge of the node header, for a running step that reports progress. Place it in
 * `NodePanel.Overlay`. Decorative (`aria-hidden`): the application announces the run status.
 */
export function NodeRunProgress({ value, className }: NodeRunProgressProps) {
  const percent = Math.min(100, Math.max(0, value || 0));

  return (
    <span className={clsx(styles['progress'], className)} aria-hidden="true">
      <span className={styles['fill']} style={{ width: `${percent}%` }} />
    </span>
  );
}
