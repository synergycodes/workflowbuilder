import clsx from 'clsx';
import { forwardRef } from 'react';

import styles from './nav-button.module.css';

import { BaseButton } from '../base-button/base-button';
import type { NavButtonProps } from './types';

export const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>((buttonProps, ref) => {
  const {
    children,
    className,
    isSelected = false,
    prefixIcon,
    size = 'm',
    suffixIcon,
    variant = 'square',
    ...props
  } = buttonProps;
  const isIconOnly = children == null || children === false || children === '';

  return (
    <BaseButton
      ref={ref}
      className={className}
      styles={clsx(styles['nav-button'], styles[size], styles[variant], {
        [styles['icon-only']]: isIconOnly,
        [styles['selected']]: isSelected,
      })}
      {...props}
    >
      {isIconOnly ? (
        <span className={styles['icon']}>{prefixIcon}</span>
      ) : (
        <>
          {prefixIcon != null && <span className={styles['icon']}>{prefixIcon}</span>}
          <span>{children}</span>
          {suffixIcon != null && <span className={styles['icon']}>{suffixIcon}</span>}
        </>
      )}
    </BaseButton>
  );
});
