import clsx from 'clsx';
import { forwardRef } from 'react';

import fontSizeStyles from '../../styles/font-size.module.css';
import paddingStyles from '../../styles/label-button-padding.module.css';
import loaderStyles from './loader.module.css';

import { BaseButton } from '../../base-button/base-button';
import { BaseRegularButtonProps } from '../types';

export type LabelButtonProps = {
  isLoading?: boolean;
  children: string;
} & BaseRegularButtonProps;

export const LabelButton = forwardRef<HTMLButtonElement, LabelButtonProps>(
  ({ size = 'medium', isLoading, children, ...props }, ref) => (
    <BaseButton
      ref={ref}
      styles={clsx(fontSizeStyles[size], paddingStyles[size], {
        [loaderStyles['disable-events']]: isLoading,
      })}
      {...props}
    >
      {<span className={clsx({ [loaderStyles['hide-label']]: isLoading })}>{children}</span>}
      {isLoading && <span className={loaderStyles['dot-flashing']}></span>}
    </BaseButton>
  ),
);
