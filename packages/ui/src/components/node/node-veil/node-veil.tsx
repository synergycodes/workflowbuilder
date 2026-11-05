import clsx from 'clsx';

import styles from './node-veil.module.css';

export type NodeVeilProps = {
  className?: string;
};

/**
 * Dims the whole node, for example a skipped step. Place it in `NodePanel.Overlay`.
 */
export function NodeVeil({ className }: NodeVeilProps) {
  return <span className={clsx(styles['veil'], className)} />;
}
