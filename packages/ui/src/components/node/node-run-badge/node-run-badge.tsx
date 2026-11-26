import clsx from 'clsx';
import type { CSSProperties } from 'react';

import '../run-status/variables.css';
import styles from './node-run-badge.module.css';

import { BadgeLabel, BadgeLabelProps } from '../../badge-label/badge-label';
import type { NodeRunToneName } from '../run-status/run-status-tone';
import { runStatusVariable } from '../run-status/run-status-variable';

export type NodeRunBadgeProps = Omit<BadgeLabelProps, 'variant' | 'size'> & {
  /**
   * Colour pair of the label, read from `--wb-public-node-run-status-{bg,fg}-<tone>`. `inverse` renders the
   * `BadgeLabel` Inverse variant.
   */
  tone: NodeRunToneName;
  /** Lowers the label's opacity, for example on a skipped step. */
  dimmed?: boolean;
};

/**
 * Run status label above the node's top-right corner: a `BadgeLabel` of size `m`, coloured by `tone`. Place it in
 * `NodePanel.Overlay`; it grows to the left and never wraps.
 */
export function NodeRunBadge({ tone, dimmed = false, className, style, ...rest }: NodeRunBadgeProps) {
  const inverse = tone === 'inverse';
  const toneStyle = inverse
    ? undefined
    : ({
        '--badge-label-background-color': runStatusVariable('bg', tone),
        '--badge-label-color': runStatusVariable('fg', tone),
      } as CSSProperties);

  return (
    <BadgeLabel
      {...rest}
      size="m"
      variant={inverse ? 'inverse' : 'default'}
      className={clsx(styles['badge'], { [styles['dimmed']]: dimmed }, className)}
      style={{ ...toneStyle, ...style }}
      data-tone={tone}
    />
  );
}
