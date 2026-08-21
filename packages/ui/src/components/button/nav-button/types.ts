import type { ButtonHTMLAttributes, ReactNode } from 'react';

import type { TooltipVariant } from '../../tooltip/types';

export const NAV_BUTTON_SIZES = ['xl', 'l', 'm', 's', 'xs', 'xxs', 'xxxs'] as const;

export type NavButtonSize = (typeof NAV_BUTTON_SIZES)[number];

export const NAV_BUTTON_VARIANTS = ['square', 'round', 'plain'] as const;

export type NavButtonVariant = (typeof NAV_BUTTON_VARIANTS)[number];

export type NavLabelButtonProps = {
  /** @default 'm' */
  size?: NavButtonSize;
  /** @default 'square' */
  variant?: NavButtonVariant;
  isSelected?: boolean;
  children: ReactNode;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export type NavIconButtonProps = {
  /** @default 'm' */
  size?: NavButtonSize;
  /** @default 'square' */
  variant?: NavButtonVariant;
  isSelected?: boolean;
  prefixIcon: ReactNode;
  children?: never;
  suffixIcon?: never;
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export type NavButtonProps = NavLabelButtonProps | NavIconButtonProps;
