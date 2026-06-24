import { WithIcon } from '@ui/shared/types/with-icon';
import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './icon-switch.module.css';

import { BaseSwitchProps, Switch } from '../switch';

type IconSwitchProps = WithIcon & {
  IconChecked: ReactNode;
  variant?: Variant;
} & BaseSwitchProps;

type Variant = 'primary' | 'secondary';

export function IconSwitch({
  icon,
  IconChecked,
  className,
  checked,
  variant = 'primary',
  onChange,
  ...props
}: IconSwitchProps) {
  return (
    <Switch
      checked={checked}
      className={clsx(styles['container'], className)}
      onChange={onChange}
      trackChildren={
        <div className={styles['track']}>
          <div className={styles['icon']}>{icon}</div>
          <div className={styles['icon']}>{IconChecked}</div>
        </div>
      }
      thumbChildren={
        <div className={clsx(styles['thumb'], styles[variant])}>
          <div className={clsx(styles['icon'], styles['icon-selected'])}>
            {!checked && icon}
            {checked && IconChecked}
          </div>
        </div>
      }
      {...props}
    />
  );
}
