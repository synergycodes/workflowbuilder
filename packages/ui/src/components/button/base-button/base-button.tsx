import { Tooltip } from '@ui/components/tooltip/tooltip';
import clsx from 'clsx';
import { forwardRef } from 'react';

import buttonStyles from './base-button.module.css';

import { BaseButtonProps } from '../types';

type Props = {
  /** Class name meant to be used by parent components using <BaseButton /> directly */
  styles: string;
  children: React.ReactNode;
} & BaseButtonProps;

export const BaseButton = forwardRef<HTMLButtonElement, Props>(
  ({ children, styles, className, tooltip, disabled, type = 'button', tooltipType = 'default', ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        type={type}
        className={clsx(buttonStyles['button'], styles, className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );

    return tooltip && !disabled ? (
      <Tooltip>
        <Tooltip.Trigger>{button}</Tooltip.Trigger>
        <Tooltip.Content tooltipType={tooltipType}>{tooltip}</Tooltip.Content>
      </Tooltip>
    ) : (
      button
    );
  },
);
