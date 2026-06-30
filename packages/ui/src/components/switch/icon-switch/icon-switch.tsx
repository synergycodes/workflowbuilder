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
          {/* Render both icons and let CSS swap them off the switch's
              `data-checked` state, so the thumb icon tracks the real state in
              uncontrolled mode too (reading the `checked` prop only works when
              the switch is controlled). */}
          <div className={clsx(styles['icon'], styles['icon-unchecked'])}>{icon}</div>
          <div className={clsx(styles['icon'], styles['icon-checked'])}>{IconChecked}</div>
        </div>
      }
      {...props}
    />
  );
}
