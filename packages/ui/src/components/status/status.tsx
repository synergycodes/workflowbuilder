import { ExclamationMark } from '@phosphor-icons/react';
import clsx from 'clsx';

import styles from './status.module.css';

export type ValidationStatus = 'invalid';

export type StatusProps = {
  /**
   * The validation status to display.
   */
  status?: ValidationStatus;
  /**
   * Custom class name for the component.
   */
  className?: string;
};

/**
 * A component that displays a visual indicator based on validation status.
 */
export function Status({ status, className }: StatusProps) {
  if (status === 'invalid') {
    return (
      <span className={clsx(styles['status-container'], styles['status-container--invalid'], className)}>
        <ExclamationMark />
      </span>
    );
  }

  return null;
}
