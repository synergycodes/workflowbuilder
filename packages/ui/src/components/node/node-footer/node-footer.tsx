import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

import '../run-status/variables.css';
import styles from './node-footer.module.css';

import type { NodeRunToneName } from '../run-status/run-status-tone';
import { runStatusVariable } from '../run-status/run-status-variable';

/**
 * Text style of the footer message: `s` is Label S, `m` is Body S.
 *
 * @category Node
 */
export type NodeFooterSize = 's' | 'm';

export type NodeFooterProps = {
  /** Colour of the message and the icon, read from `--wb-public-node-run-status-fg-<tone>`. */
  tone: NodeRunToneName;
  /** One line of text; it ends with an ellipsis when it does not fit. */
  message: string;
  /**
   * `s` sets the message in Label S, `m` in Body S.
   * @default 's'
   */
  size?: NodeFooterSize;
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
    <div
      className={clsx(styles['footer'], className)}
      style={{ '--footer-color': runStatusVariable('fg', tone) } as CSSProperties}
      data-tone={tone}
    >
      {icon && <span className={styles['icon']}>{icon}</span>}
      {/* Native title until the DS Tooltip takes over; no keyboard or touch access today (follow-up: node-text-ds-tooltip). */}
      <span className={clsx(styles['message'], styles[size])} title={message}>
        {message}
      </span>
      {children && <div className={styles['actions']}>{children}</div>}
    </div>
  );
}
