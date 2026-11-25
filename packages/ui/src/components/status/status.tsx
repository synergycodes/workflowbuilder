import { ExclamationMark } from '@phosphor-icons/react';
import clsx from 'clsx';

import styles from './status.module.css';

/**
 * Tone of a `Status` indicator. `critical` marks a validation problem.
 *
 * @category Status
 */
export type StatusTone = 'critical';

export type StatusProps = {
  /**
   * The tone to display; without it the component renders nothing.
   */
  tone?: StatusTone;
  /**
   * Custom class name for the component.
   */
  className?: string;
};

/**
 * A component that displays a visual indicator based on validation status.
 */
export function Status({ tone, className }: StatusProps) {
  if (tone === 'critical') {
    return (
      <span className={clsx(styles['status-container'], styles['status-container--critical'], className)}>
        <ExclamationMark />
      </span>
    );
  }

  return null;
}
