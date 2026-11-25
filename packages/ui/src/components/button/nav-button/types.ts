import type { ReactNode } from 'react';

import type { BaseButtonProps, IconNode } from '../types';

export const NAV_BUTTON_SIZES = ['xl', 'l', 'm', 's', 'xs', 'xxs', 'xxxs'] as const;

/**
 * Size of a `NavButton`, from `xl` down to `xxxs`.
 *
 * @category NavButton
 */
export type NavButtonSize = (typeof NAV_BUTTON_SIZES)[number];

export const NAV_BUTTON_SHAPES = ['square', 'round'] as const;

/**
 * Shape of a `NavButton`.
 *
 * @category NavButton
 */
export type NavButtonShape = (typeof NAV_BUTTON_SHAPES)[number];

export const NAV_BUTTON_VARIANTS = ['default', 'plain'] as const;

/**
 * Style of a `NavButton`. `plain` has no background and is available for icon-only buttons only.
 *
 * @category NavButton
 */
export type NavButtonVariant = (typeof NAV_BUTTON_VARIANTS)[number];

/**
 * Props shared by the labelled and the icon-only `NavButton`.
 *
 * @category NavButton
 */
export type NavButtonBaseProps = Omit<BaseButtonProps, 'children'> & {
  /** @default 'm' */
  size?: NavButtonSize;
  /** @default 'square' */
  shape?: NavButtonShape;
  /** Renders the button in its selected state. */
  selected?: boolean;
};

/**
 * Props of a `NavButton` with a text label.
 *
 * @category NavButton
 */
export type NavLabelButtonProps = NavButtonBaseProps & {
  /** @default 'default' */
  variant?: Exclude<NavButtonVariant, 'plain'>;
  children: ReactNode;
  /** Icon before the label. */
  prefixIcon?: IconNode;
  /** Icon after the label. */
  suffixIcon?: IconNode;
};

/**
 * Props of an icon-only `NavButton`: it takes `prefixIcon` and no children.
 *
 * @category NavButton
 */
export type NavIconButtonProps = NavButtonBaseProps & {
  /** @default 'default' */
  variant?: NavButtonVariant;
  prefixIcon: IconNode;
  children?: never;
  suffixIcon?: never;
};

/**
 * @category NavButton
 */
export type NavButtonProps = NavLabelButtonProps | NavIconButtonProps;
