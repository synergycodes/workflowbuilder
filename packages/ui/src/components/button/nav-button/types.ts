import type { ButtonHTMLAttributes, ReactNode } from 'react';

import type { TooltipVariant } from '../../tooltip/types';

export const NAV_BUTTON_SIZES = ['xl', 'l', 'm', 's', 'xs', 'xxs', 'xxxs'] as const;

export type NavButtonSize = (typeof NAV_BUTTON_SIZES)[number];

export const NAV_BUTTON_STYLES = ['square', 'round', 'plain'] as const;

export type NavButtonStyle = (typeof NAV_BUTTON_STYLES)[number];

export type NavButtonProps = {
  /** @default 'm' */
  size?: NavButtonSize;
  /** @default 'square' */
  styleVariant?: NavButtonStyle;
  isSelected?: boolean;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;
