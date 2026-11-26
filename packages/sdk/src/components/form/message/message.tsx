import infoIcon from '@iconify-icons/ph/info';
import warningIcon from '@iconify-icons/ph/warning';
import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

import styles from './message.module.css';

import { Icon } from '../../../icon/icon';

type Props = {
  className?: string;
  variant?: 'neutral' | 'warning' | 'error';
};

export function Message({ className = '', variant = 'neutral', children }: PropsWithChildren<Props>) {
  return (
    <div className={clsx(styles['container'], styles[`container--${variant}`], className)}>
      <Icon icon={variant === 'neutral' ? infoIcon : warningIcon} />
      <div className={styles['content']}>{children}</div>
    </div>
  );
}
