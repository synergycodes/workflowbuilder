import clsx from 'clsx';
import type { CSSProperties, HTMLAttributes } from 'react';

import '../run-status/variables.css';
import styles from './node-run-ring.module.css';

import type { NodeRunToneName } from '../run-status/run-status-tone';
import { runStatusVariable } from '../run-status/run-status-variable';

/**
 * `static` keeps the halo at its width, `heartbeat` pulses it (a running node with progress), `waiting` pulses it
 * wider and slower. Only the `info`, `warning` and `human` tones have a halo colour,
 * `--wb-public-node-run-status-halo-<tone>`.
 *
 * @category Node
 */
export type NodeRunRingHalo = 'static' | 'heartbeat' | 'waiting';

export type NodeRunRingProps = {
  /** Colour of the 1px line drawn over the node stroke, and of the halo. */
  tone: NodeRunToneName;
  /** Glow outside the node. Without it the ring draws only the line. */
  halo?: NodeRunRingHalo;
} & HTMLAttributes<HTMLSpanElement>;

/**
 * Run status line and halo around a node. Place it in `NodePanel.Overlay`: it covers the node without changing its
 * size.
 * Reduced motion keeps the `heartbeat` halo static and hides the `waiting` one.
 */
export function NodeRunRing({ tone, halo, className, style, ...rest }: NodeRunRingProps) {
  const toneStyle = {
    '--ring-color': runStatusVariable('stroke', tone),
    '--ring-halo-color': runStatusVariable('halo', tone),
  } as CSSProperties;

  return (
    <span
      {...rest}
      className={clsx(styles['ring'], className)}
      style={{ ...toneStyle, ...style }}
      data-tone={tone}
      data-halo={halo}
    />
  );
}
