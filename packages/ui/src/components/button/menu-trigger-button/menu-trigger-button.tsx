import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { NavButton } from '../nav-button/nav-button';

export type MenuTriggerButtonProps = {
  children: ReactNode;
  isOpen?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const MenuTriggerButton = forwardRef<HTMLButtonElement, MenuTriggerButtonProps>(
  ({ children, isOpen = false, ...props }, ref) => (
    <NavButton ref={ref} isSelected={isOpen} prefixIcon={children} {...props} />
  ),
);
