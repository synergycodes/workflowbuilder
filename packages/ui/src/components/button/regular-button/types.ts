import type { ButtonHTMLAttributes, ReactNode } from 'react';

import type { TooltipVariant } from '../../tooltip/types';

export const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'critical',
  'success',
  'warning',
  'ghost-primary',
  'ghost-secondary',
  'ghost-critical',
  'ghost-success',
  'ghost-warning',
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ['xl', 'l', 'm', 's', 'xs'] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

export const BUTTON_SHAPES = ['default', 'square', 'round'] as const;

export type ButtonShape = (typeof BUTTON_SHAPES)[number];

export type ButtonProps = {
  /** @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'm' */
  size?: ButtonSize;
  /**
   * Square and round buttons render only `prefixIcon`, or a single element child as a fallback.
   * @default 'default'
   */
  shape?: ButtonShape;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  isLoading?: boolean;
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;
