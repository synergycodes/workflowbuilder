import clsx from 'clsx';
import { forwardRef } from 'react';

import navButtonBorderRadiusStyles from '../styles/nav-button-border-radius.module.css';
import navButtonIconSizeStyles from '../styles/nav-button-icon-size.module.css';
import navButtonIconPaddingStyles from './nav-button-icon-padding.module.css';
import navIconButtonStyles from './nav-icon-button.module.css';

import { BaseButton } from '../../base-button/base-button';
import { IconNode, Shape } from '../../types';
import { NavBaseButtonProps } from '../types';

export type NavIconButtonProps = {
  shape?: Shape;
  transparent?: boolean;
  children: IconNode;
} & NavBaseButtonProps;

export const NavIconButton = forwardRef<HTMLButtonElement, NavIconButtonProps>(
  ({ size = 'medium', shape = 'default', children, transparent, ...props }, ref) => (
    <BaseButton
      ref={ref}
      styles={clsx(
        navButtonIconPaddingStyles[size],
        navButtonIconSizeStyles[size],
        navButtonBorderRadiusStyles[shape],
        { [navIconButtonStyles['transparent']]: transparent },
      )}
      {...props}
    >
      {children}
    </BaseButton>
  ),
);
