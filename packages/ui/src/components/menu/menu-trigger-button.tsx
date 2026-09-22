import { NavButton } from '@ui/components/button/nav-button/nav-button';
import type { NavButtonSize, NavButtonVariant } from '@ui/components/button/nav-button/types';
import type { BaseButtonProps, IconNode } from '@ui/components/button/types';
import { forwardRef, useContext } from 'react';

import { MenuOpenContext } from './menu-open-context';

export type MenuTriggerButtonProps = BaseButtonProps & {
  children: IconNode;
  /** @default 'm' */
  size?: NavButtonSize;
  /** @default 'square' */
  variant?: NavButtonVariant;
};

/**
 * Icon-only trigger for a `Menu`. Rendered as the `Menu` child, it shows the
 * pressed state for as long as the menu is open.
 */
export const MenuTriggerButton = forwardRef<HTMLButtonElement, MenuTriggerButtonProps>(
  ({ children, ...props }, ref) => {
    const isOpen = useContext(MenuOpenContext);

    return <NavButton ref={ref} isSelected={isOpen} prefixIcon={children} {...props} />;
  },
);
