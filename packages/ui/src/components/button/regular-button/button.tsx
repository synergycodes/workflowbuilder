import clsx from 'clsx';
import { forwardRef, isValidElement } from 'react';

import borderRadiusStyles from '../styles/border-radius.module.css';
import fontSizeStyles from '../styles/font-size.module.css';
import gapStyles from '../styles/gap.module.css';
import heightStyles from '../styles/height.module.css';
import iconPaddingStyles from '../styles/icon-padding.module.css';
import iconSizeStyles from '../styles/icon-size.module.css';
import paddingStyles from '../styles/padding.module.css';
import variantStyles from '../styles/variant.module.css';
import loaderStyles from './loader.module.css';

import { BaseButton } from '../base-button/base-button';
import type { ButtonProps } from './types';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      isLoading = false,
      prefixIcon,
      shape = 'default',
      size = 'm',
      suffixIcon,
      variant = 'primary',
      ...props
    },
    ref,
  ) => {
    const isIconOnly = shape !== 'default';
    const icon = prefixIcon ?? (isValidElement(children) ? children : null);
    const hiddenContentClassName = clsx({ [loaderStyles['hide-content']]: isLoading });

    return (
      <BaseButton
        ref={ref}
        className={className}
        styles={clsx(
          variantStyles[variant],
          heightStyles[size],
          iconSizeStyles[size],
          borderRadiusStyles[shape === 'round' ? 'round' : size],
          isIconOnly ? iconPaddingStyles[size] : [fontSizeStyles[size], gapStyles[size], paddingStyles[size]],
          { [loaderStyles['disable-events']]: isLoading },
        )}
        {...props}
      >
        {isIconOnly ? (
          <span className={clsx(iconSizeStyles['icon'], hiddenContentClassName)}>{icon}</span>
        ) : (
          <>
            {prefixIcon != null && (
              <span className={clsx(iconSizeStyles['icon'], hiddenContentClassName)}>{prefixIcon}</span>
            )}
            <span className={hiddenContentClassName}>{children}</span>
            {suffixIcon != null && (
              <span className={clsx(iconSizeStyles['icon'], hiddenContentClassName)}>{suffixIcon}</span>
            )}
          </>
        )}
        {isLoading && <span className={loaderStyles['dot-flashing']} />}
      </BaseButton>
    );
  },
);
