import clsx from 'clsx';
import type { ReactNode } from 'react';

import '../run-status/variables.css';
import styles from './node-footer.module.css';

import type { RunStatusTone } from '../run-status/run-status-tone';

/**
 * Colour role of the footer message and icon, read from `--wb-public-node-footer-color-<tone>`.
 *
 * @category Node
 */
export type NodeFooterTone = Exclude<RunStatusTone, 'inverse'>;

export type NodeFooterProps = {
  /** Colour of the message and the icon. */
  tone: NodeFooterTone;
  /** One line of text; it ends with an ellipsis when it does not fit. */
  message: string;
  /**
   * `s` sets the message in Label S, `m` in Body S.
   * @default 's'
   */
  size?: 's' | 'm';
  /** Glyph before the message, drawn at 14 px in the tone colour. */
  icon?: ReactNode;
  /** Actions after the message, for example one or two `Button`s of size `xs`. */
  children?: ReactNode;
  className?: string;
};

/**
 * Bottom strip of a node with a status message and optional actions, below a divider. Place it in
 * `NodePanel.Footer`.
 *
 * @category Node
 */
export function NodeFooter({ tone, message, size = 's', icon, children, className }: NodeFooterProps) {
  return (
    <div className={clsx(styles['footer'], className)} data-tone={tone}>
      {icon && <span className={styles['icon']}>{icon}</span>}
      <span className={clsx(size === 'm' ? 'wb-text-body-s' : 'wb-text-label-s', styles['message'])} title={message}>
        {message}
      </span>
      {children && <div className={styles['actions']}>{children}</div>}
    </div>
  );
}
