import clsx from 'clsx';
import { Children, forwardRef } from 'react';

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
  const renderableChildren = Children.toArray(children).filter((child) => child !== '');
  const isIconOnly = renderableChildren.length === 0;

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
        <span className={styles['icon']}>{prefixIcon ?? suffixIcon}</span>
      ) : (
        <>
          {prefixIcon != null && <span className={styles['icon']}>{prefixIcon}</span>}
          <span>{renderableChildren}</span>
          {suffixIcon != null && <span className={styles['icon']}>{suffixIcon}</span>}
        </>
      )}
    </BaseButton>
  );
});
