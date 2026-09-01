import type { ReactNode } from 'react';

import type { BaseButtonProps, IconNode } from '../types';

export const NAV_BUTTON_SIZES = ['xl', 'l', 'm', 's', 'xs', 'xxs', 'xxxs'] as const;

export type NavButtonSize = (typeof NAV_BUTTON_SIZES)[number];

export const NAV_BUTTON_VARIANTS = ['square', 'round', 'plain'] as const;

export type NavButtonVariant = (typeof NAV_BUTTON_VARIANTS)[number];

type NavButtonBaseProps = Omit<BaseButtonProps, 'children'> & {
  /** @default 'm' */
  size?: NavButtonSize;
  isSelected?: boolean;
};

export type NavLabelButtonProps = NavButtonBaseProps & {
  /** @default 'square' */
  variant?: Exclude<NavButtonVariant, 'plain'>;
  children: ReactNode;
  prefixIcon?: IconNode;
  suffixIcon?: IconNode;
};

export type NavIconButtonProps = NavButtonBaseProps & {
  /** @default 'square' */
  variant?: NavButtonVariant;
  prefixIcon: IconNode;
  children?: never;
  suffixIcon?: never;
};

export type NavButtonProps = NavLabelButtonProps | NavIconButtonProps;
