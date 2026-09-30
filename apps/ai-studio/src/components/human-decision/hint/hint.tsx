import { Icon } from '@workflowbuilder/sdk';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './hint.module.css';

export type HintVariant = 'neutral' | 'info' | 'warning';

const ICONS = { neutral: undefined, info: 'Info', warning: 'Warning' } as const;

type Props = { variant: HintVariant; children: ReactNode };

/** A note in a properties section: neutral for guidance, info for how the node behaves, warning for a gap. */
export function Hint({ variant, children }: Props) {
  const icon = ICONS[variant];
  return (
    <p role="status" className={clsx(styles['hint'], styles[`hint--${variant}`])} data-hint={variant}>
      {icon && <Icon name={icon} className={styles['icon']} aria-hidden />}
      <span>{children}</span>
    </p>
  );
}
