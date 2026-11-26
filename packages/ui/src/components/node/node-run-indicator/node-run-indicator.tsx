import clsx from 'clsx';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import '../run-status/variables.css';
import styles from './node-run-indicator.module.css';

import type { NodeRunTone, NodeRunToneName } from '../run-status/run-status-tone';
import { runStatusVariable } from '../run-status/run-status-variable';

/**
 * `running` turns in 0.7s; `slow` turns in 2.4s, for a step that has stopped reporting (No signal).
 *
 * @category Node
 */
export type NodeRunSpinner = 'running' | 'slow';

export type NodeRunIndicatorBaseProps = {
  /**
   * Background of the circle, and the glyph colour unless `iconTone` is set. `inverse` is a glyph tone only: as a
   * circle tone it draws the `neutral` circle.
   */
  tone: Exclude<NodeRunTone, 'inverse'> | (string & {});
  /** Glyph colour when it differs from `tone`, for example `inverse` on a `neutral` circle (Rejected). */
  iconTone?: NodeRunToneName;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;

export type NodeRunIndicatorIconProps = NodeRunIndicatorBaseProps & {
  /** Glyph in the circle, sized to 12px. */
  icon: ReactNode;
  spinner?: never;
};

export type NodeRunIndicatorSpinnerProps = NodeRunIndicatorBaseProps & {
  /** Spinner in the circle instead of a glyph. Reduced motion stops it with the arc on top. */
  spinner: NodeRunSpinner;
  icon?: never;
};

export type NodeRunIndicatorProps = NodeRunIndicatorIconProps | NodeRunIndicatorSpinnerProps;

/**
 * Run status circle at the end of the node header. Place it as the last child of `NodePanel.Header`; a long title
 * truncates before it. Decorative (`aria-hidden`) by default: the badge text carries the status.
 */
export function NodeRunIndicator({ tone, iconTone, icon, spinner, className, style, ...rest }: NodeRunIndicatorProps) {
  const toneStyle = {
    '--indicator-background-color': runStatusVariable('bg', tone),
    '--indicator-icon-color': runStatusVariable('fg', iconTone ?? tone),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      {...rest}
      className={clsx(styles['indicator'], className)}
      style={{ ...toneStyle, ...style }}
      data-tone={tone}
      data-icon-tone={iconTone ?? tone}
    >
      {spinner ? <span className={styles['spinner']} data-spinner={spinner} /> : icon}
    </span>
  );
}
