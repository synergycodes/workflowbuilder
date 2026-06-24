import clsx from 'clsx';
import { forwardRef } from 'react';

import fontSizeStyles from '../../styles/font-size.module.css';
import gapStyles from '../../styles/gap.module.css';
import paddingStyles from '../../styles/icon-label-button-padding.module.css';
import iconSizeStyles from '../../styles/icon-size.module.css';
import navFontSizeStyles from '../styles/nav-button-font-size.module.css';
import navButtonIconSizeStyles from '../styles/nav-button-icon-size.module.css';
import navGapStyles from './nav-button-gap.module.css';
import navPaddingStyles from './nav-icon-label-button-padding.module.css';

import { BaseButton } from '../../base-button/base-button';
import { IconNode } from '../../types';
import { NavBaseButtonProps } from '../types';

export type NavIconLabelButtonProps = {
  children: [IconNode, string] | [string, IconNode] | [IconNode, string, IconNode];
} & NavBaseButtonProps;

export const NavIconLabelButton = forwardRef<HTMLButtonElement, NavIconLabelButtonProps>(
  ({ size = 'medium', children, ...props }, ref) => (
    <BaseButton
      ref={ref}
      styles={clsx(
        fontSizeStyles[size],
        navFontSizeStyles[size],
        iconSizeStyles[size],
        navButtonIconSizeStyles[size],
        paddingStyles[size],
        navPaddingStyles[size],
        gapStyles[size],
        navGapStyles[size],
      )}
      {...props}
    >
      {children}
    </BaseButton>
  ),
);
