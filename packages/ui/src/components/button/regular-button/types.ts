import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

import type { TooltipVariant } from '../../tooltip/types';

export const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'critical',
  'success',
  'ghost-primary',
  'ghost-secondary',
  'ghost-critical',
  'ghost-success',
] as const;

/**
 * Visual style of a `Button`. Each `ghost-*` variant is the outlined counterpart of the filled one.
 *
 * @category Button
 */
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ['xl', 'l', 'm', 's', 'xs'] as const;

/**
 * Size of a `Button`, from `xl` down to `xs`.
 *
 * @category Button
 */
export type ButtonSize = (typeof BUTTON_SIZES)[number];

export const BUTTON_SHAPES = ['default', 'square', 'round'] as const;

/**
 * Shape of a `Button`. Use `square` or `round` for icon-only buttons.
 *
 * @category Button
 */
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
