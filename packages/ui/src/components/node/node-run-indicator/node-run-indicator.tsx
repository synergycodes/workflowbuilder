import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './node-run-indicator.module.css';

import type { RunStatusTone } from '../run-status-tone';

/**
 * `running` turns in 0.7s; `slow` turns in 2.4s, for a step that has stopped reporting (No signal).
 *
 * @category Node
 */
export type NodeRunSpinner = 'running' | 'slow';

export type NodeRunIndicatorBaseProps = {
  /** Background of the circle, and the glyph colour unless `iconTone` is set. */
  tone: RunStatusTone;
  /** Glyph colour when it differs from `tone`, for example `inverse` on a `neutral` circle (Rejected). */
  iconTone?: RunStatusTone;
  className?: string;
};

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
 * truncates before it. Decorative (`aria-hidden`): the badge text carries the status.
 */
export function NodeRunIndicator({ tone, iconTone, icon, spinner, className }: NodeRunIndicatorProps) {
  return (
    <span
      className={clsx(styles['indicator'], className)}
      data-tone={tone}
      data-icon-tone={iconTone ?? tone}
      aria-hidden="true"
    >
      {spinner ? <span className={styles['spinner']} data-spinner={spinner} /> : icon}
    </span>
  );
}
