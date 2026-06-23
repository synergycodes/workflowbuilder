import clsx from 'clsx';
import { forwardRef } from 'react';

import fontSizeStyles from '../../styles/font-size.module.css';
import paddingStyles from '../../styles/label-button-padding.module.css';
import navFontSizeStyles from '../styles/nav-button-font-size.module.css';
import navPaddingStyles from './nav-label-button-padding.module.css';

import { BaseButton } from '../../base-button/base-button';
import { NavBaseButtonProps } from '../types';

export type NavLabelButtonProps = {
  children: string;
} & NavBaseButtonProps;

export const NavLabelButton = forwardRef<HTMLButtonElement, NavLabelButtonProps>(
  ({ size = 'medium', children, ...props }, ref) => (
    <BaseButton
      ref={ref}
      styles={clsx(fontSizeStyles[size], navFontSizeStyles[size], paddingStyles[size], navPaddingStyles[size])}
      {...props}
    >
      {children}
    </BaseButton>
  ),
);
