import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

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
  prefixIcon?: ReactElement;
  suffixIcon?: ReactElement;
  /** @default false */
  isLoading?: boolean;
  tooltip?: string;
  /** @default 'default' */
  tooltipType?: TooltipVariant;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export type IconButtonProps = {
  /** @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'm' */
  size?: ButtonSize;
  shape: Exclude<ButtonShape, 'default'>;
  prefixIcon: ReactElement;
  children?: never;
  suffixIcon?: never;
  /** @default false */
  isLoading?: boolean;
  tooltip?: string;
  /** @default 'default' */
  tooltipType?: TooltipVariant;
  'aria-label': string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'>;

export type ButtonProps = LabelButtonProps | IconButtonProps;
