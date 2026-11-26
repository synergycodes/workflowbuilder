import { Info } from '@phosphor-icons/react';
import { WithIcon } from '@ui/shared/types/with-icon';
import { clsx } from 'clsx';

import styles from './icon.module.css';

import type { SnackbarTone } from '../types';

type IconProps = WithIcon & {
  isCentered: boolean;
  tone: SnackbarTone;
};

export function Icon({ icon, isCentered, tone }: IconProps) {
  return (
    <div
      className={clsx(styles['container'], {
        [styles['center']]: isCentered,
      })}
    >
      {icon ?? <Info className={clsx(styles['status'], styles[tone])} />}
    </div>
  );
}
