import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

import styles from './node-run-ring.module.css';

import type { RunStatusTone } from '../run-status/run-status-tone';

/**
 * `static` keeps the halo at its width, `heartbeat` pulses it (a running node with progress), `waiting` pulses it
 * wider and slower. By default only the `info`, `warning` and `human` tones have a halo colour; the others are
 * `transparent` until their `--wb-public-node-run-ring-halo-color-<tone>` is set.
 *
 * @category Node
 */
export type NodeRunRingHalo = 'static' | 'heartbeat' | 'waiting';

export type NodeRunRingProps = {
  /** Colour of the 1px line drawn over the node stroke, and of the halo. */
  tone: RunStatusTone;
  /** Glow outside the node. Without it the ring draws only the line. */
  halo?: NodeRunRingHalo;
} & HTMLAttributes<HTMLSpanElement>;

/**
 * Run status line and halo around a node. Place it in `NodePanel.Overlay`: it covers the node without changing its
 * size, and a selected node under it drops its focus ring (see `--wb-public-node-box-shadow-selected-with-run-status`).
 * Reduced motion keeps the `heartbeat` halo static and hides the `waiting` one.
 */
export function NodeRunRing({ tone, halo, className, ...rest }: NodeRunRingProps) {
  return (
    <span
      {...rest}
      className={clsx(styles['ring'], className)}
      data-tone={tone}
      data-halo={halo}
      data-node-run-overlay
    />
  );
}
