import clsx from 'clsx';
import { forwardRef } from 'react';

import styles from './snackbar.module.css';

import { ActionButtons } from './components/action-buttons';
import { Icon } from './components/icon';
import { Message } from './components/message';
import type { SnackbarTone } from './types';

export type SnackbarProps = {
  /**
   * Meaning of the message, which sets its colours, icon colour and action button style
   */
  tone: SnackbarTone;
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
   * Callback fired when the close button is clicked. The close button is shown only when it is set.
   */
  onClose?: () => void;
};

/**
 * A Snackbar component that displays brief messages about app processes.
 * Purely presentational: it does not position or auto-dismiss itself - placement
 * and lifetime (e.g. an auto-hide timer) are the consumer's responsibility, and
 * dismissal is driven through `onClose`.
 */
export const Snackbar = forwardRef<HTMLDivElement, SnackbarProps>(
  ({ tone, title, subtitle, buttonLabel, onButtonClick, onClose }, ref) => (
    <div ref={ref} role="status" aria-live="polite" className={clsx(styles['container'], styles[tone])}>
      <div className={styles['content']}>
        <Icon isCentered={!subtitle} tone={tone} />
        <Message title={title} subtitle={subtitle} />
        <ActionButtons tone={tone} buttonLabel={buttonLabel} onButtonClick={onButtonClick} onClose={onClose} />
      </div>
    </div>
  ),
);
