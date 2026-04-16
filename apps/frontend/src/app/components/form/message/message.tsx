import clsx from 'clsx';
import { PropsWithChildren } from 'react';

import { Icon } from '@workflow-builder/icons';

import styles from './message.module.css';

type Props = {
  className?: string;
  variant?: 'neutral' | 'warning' | 'error';
};

export function Message({ className = '', variant = 'neutral', children }: PropsWithChildren<Props>) {
  return (
    <div className={clsx(styles['container'], styles[`container--${variant}`], className)}>
      <Icon name={variant === 'neutral' ? 'Info' : 'Warning'} />
      <div className={styles['content']}>{children}</div>
    </div>
  );
}
