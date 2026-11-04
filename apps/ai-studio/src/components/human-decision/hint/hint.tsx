import { Icon } from '@workflowbuilder/sdk';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './hint.module.css';

export type HintVariant = 'neutral' | 'info' | 'warning';

const ICONS = { neutral: undefined, info: 'Info', warning: 'Warning' } as const;

// `live` reads out every new text: a switch's, and, as the panel stays mounted, a new selection's or edge's too.
type Props = { variant: HintVariant; live?: boolean; children: ReactNode };

/** A note in a properties section: neutral for guidance, info for how the node behaves, warning for a gap. */
export function Hint({ variant, live = false, children }: Props) {
  const icon = ICONS[variant];
  return (
    <p
      role={live ? 'status' : undefined}
      className={clsx(styles['hint'], styles[`hint--${variant}`])}
      data-hint={variant}
    >
      {icon && <Icon name={icon} className={styles['icon']} aria-hidden />}
      <span>{children}</span>
    </p>
  );
}
