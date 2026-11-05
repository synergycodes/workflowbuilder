import clsx from 'clsx';

import styles from './node-run-badge.module.css';

import { BadgeLabel, BadgeLabelProps } from '../../badge-label/badge-label';
import type { RunStatusTone } from '../run-status-tone';

export type NodeRunBadgeProps = Omit<BadgeLabelProps, 'variant' | 'size'> & {
  /** Colour pair of the label, read from `--wb-public-node-run-badge-*-<tone>`. */
  tone: RunStatusTone;
  /** Lowers the label's opacity, for example on a skipped step. */
  dimmed?: boolean;
};

/**
 * Run status label above the node's top-right corner: a `BadgeLabel` of size `m`, coloured by `tone`. Place it in
 * `NodePanel.Overlay`; it grows to the left and never wraps.
 */
export function NodeRunBadge({ tone, dimmed = false, className, ...rest }: NodeRunBadgeProps) {
  return (
    <BadgeLabel
      {...rest}
      size="m"
      className={clsx(styles['badge'], { [styles['dimmed']]: dimmed }, className)}
      data-tone={tone}
    />
  );
}
