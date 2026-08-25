import { forwardRef } from 'react';

import { NavButton } from '../nav-button/nav-button';
import type { NavButtonSize, NavButtonVariant } from '../nav-button/types';
import type { BaseButtonProps, IconNode } from '../types';

export type MenuTriggerButtonProps = BaseButtonProps & {
  children: IconNode;
  isOpen?: boolean;
  /** @default 'm' */
  size?: NavButtonSize;
  /** @default 'square' */
  variant?: NavButtonVariant;
};

export const MenuTriggerButton = forwardRef<HTMLButtonElement, MenuTriggerButtonProps>(
  ({ children, isOpen = false, ...props }, ref) => (
    <NavButton ref={ref} isSelected={isOpen} prefixIcon={children} {...props} />
  ),
);
