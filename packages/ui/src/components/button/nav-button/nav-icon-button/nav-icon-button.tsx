import clsx from 'clsx';
import { forwardRef } from 'react';

import borderRadiusStyles from '../../styles/border-radius.module.css';
import iconPaddingStyles from '../../styles/icon-padding.module.css';
import iconSizeStyles from '../../styles/icon-size.module.css';
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
  ({ size = 'medium', shape = '', children, transparent, ...props }, ref) => (
    <BaseButton
      ref={ref}
      styles={clsx(
        iconPaddingStyles[size],
        navButtonIconPaddingStyles[size],
        iconSizeStyles[size],
        navButtonIconSizeStyles[size],
        borderRadiusStyles[shape],
        navButtonBorderRadiusStyles[shape],
        { [navIconButtonStyles['transparent']]: transparent },
      )}
      {...props}
    >
      {children}
    </BaseButton>
  ),
);
