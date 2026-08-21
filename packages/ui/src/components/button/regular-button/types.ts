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

export type LabelButtonProps = {
  /** @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'm' */
  size?: ButtonSize;
  /** @default 'default' */
  shape?: 'default';
  children: ReactNode;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  isLoading?: boolean;
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export type IconButtonProps = {
  /** @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'm' */
  size?: ButtonSize;
  shape: 'square' | 'round';
  prefixIcon: ReactNode;
  children?: never;
  suffixIcon?: never;
  isLoading?: boolean;
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export type ButtonProps = LabelButtonProps | IconButtonProps;
