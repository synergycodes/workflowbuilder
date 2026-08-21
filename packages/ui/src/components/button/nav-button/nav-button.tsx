import clsx from 'clsx';
import { forwardRef } from 'react';

import styles from './nav-button.module.css';

import { BaseButton } from '../base-button/base-button';
import type { NavButtonProps } from './types';

export const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(
  (
    { children, className, isSelected = false, prefixIcon, size = 'm', styleVariant = 'square', suffixIcon, ...props },
    ref,
  ) => {
    const isIconOnly = children == null;

    return (
      <BaseButton
        ref={ref}
        className={className}
        styles={clsx(styles['nav-button'], styles[size], styles[styleVariant], {
          [styles['icon-only']]: isIconOnly,
          [styles['selected']]: isSelected,
        })}
        {...props}
      >
        {prefixIcon != null && <span className={styles['icon']}>{prefixIcon}</span>}
        {children != null && <span>{children}</span>}
        {suffixIcon != null && <span className={styles['icon']}>{suffixIcon}</span>}
      </BaseButton>
    );
  },
);
