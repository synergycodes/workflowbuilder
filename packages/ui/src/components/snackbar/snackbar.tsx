import clsx from 'clsx';
import { forwardRef } from 'react';

import styles from './snackbar.module.css';

import { ActionButtons } from './components/action-buttons';
import { Icon } from './components/icon';
import { Message } from './components/message';
import { SnackbarVariant } from './types';

export type SnackbarProps = {
  /**
   * Visual style variant of the snackbar
   */
  variant: SnackbarVariant;
  /**
   * Main message displayed in the snackbar
   */
  title: string;
  /**
   * Optional secondary message displayed below the title
   */
  subtitle?: string;
  /**
   * Label for the action button
   */
  buttonLabel?: string;
  /**
   * Callback fired when the action button is clicked
   */
  onButtonClick?: () => void;
  /**
   * Whether to show the close button
   * @default false
   */
  close?: boolean;
  /**
   * Callback fired when the snackbar is closed
   */
  onClose?: () => void;
};

/**
 * A Snackbar component that displays brief messages about app processes.
 * Purely presentational: it does not position or auto-dismiss itself - placement
 * and lifetime (e.g. an auto-hide timer) are the consumer's responsibility, and
 * dismissal is driven through `close` / `onClose`.
 */
export const Snackbar = forwardRef<HTMLDivElement, SnackbarProps>(
  ({ variant, title, subtitle, buttonLabel, onButtonClick, close = false, onClose }, ref) => (
    <div ref={ref} role="status" aria-live="polite" className={clsx(styles['container'], styles[variant])}>
      <div className={styles['content']}>
        <Icon isCentered={!subtitle} variant={variant} />
        <Message title={title} subtitle={subtitle} />
        <ActionButtons
          variant={variant}
          buttonLabel={buttonLabel}
          onButtonClick={onButtonClick}
          close={close}
          onClose={onClose}
        />
      </div>
    </div>
  ),
);
