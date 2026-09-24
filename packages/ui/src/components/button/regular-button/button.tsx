import clsx from 'clsx';
import { forwardRef } from 'react';
import type { MouseEvent } from 'react';

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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    children,
    className,
    isLoading = false,
    onClick,
    prefixIcon,
    shape = 'default',
    size = 'm',
    suffixIcon,
    variant = 'primary',
    ...rest
  } = props;

  const isIconOnly = shape !== 'default';
  const hiddenContentClassName = clsx({ [loaderStyles['hide-content']]: isLoading });

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (isLoading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <BaseButton
      ref={ref}
      className={className}
      aria-busy={isLoading || undefined}
      aria-disabled={isLoading || undefined}
      onClick={handleClick}
      styles={clsx(
        variantStyles[variant],
        heightStyles[size],
        iconSizeStyles[size],
        borderRadiusStyles[shape === 'round' ? 'round' : size],
        isIconOnly ? iconPaddingStyles[size] : [fontSizeStyles[size], gapStyles[size], paddingStyles[size]],
        { [loaderStyles['disable-events']]: isLoading },
      )}
      {...rest}
    >
      {isIconOnly ? (
        <span className={clsx(iconSizeStyles['icon'], hiddenContentClassName)}>{prefixIcon}</span>
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
});
