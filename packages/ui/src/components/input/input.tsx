import { Input as InputBase } from '@base-ui/react/input';
import { X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { forwardRef } from 'react';

import inputRootStyles from './input-root.module.css';
import inputStyles from './input.module.css';
import './variables.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import inputSizeStyles from '@ui/shared/styles/input-size.module.css';

import type { InputProps } from './types';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'm', state = 'default', prefixIcon, suffixIcon, onClear, className, disabled, readOnly, ...props },
  ref,
) {
  const isReadOnly = state === 'read-only' || readOnly === true;
  const fieldState = isReadOnly ? 'read-only' : state;

  return (
    <div
      className={clsx(inputRootStyles['input-root'], inputSizeStyles[size], className)}
      data-state={fieldState}
      data-disabled={disabled || undefined}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.currentTarget.querySelector('input')?.focus();
      }}
    >
      {prefixIcon && <span className={inputRootStyles['icon']}>{prefixIcon}</span>}
      <InputBase
        {...props}
        ref={ref}
        disabled={disabled}
        readOnly={isReadOnly}
        className={clsx(inputStyles['input'], inputFontStyles[size])}
      />
      {suffixIcon && <span className={inputRootStyles['icon']}>{suffixIcon}</span>}
      {onClear && (
        <button
          type="button"
          className={inputRootStyles['clear']}
          aria-label="Clear input"
          disabled={disabled || isReadOnly}
          onPointerDown={(event) => event.preventDefault()}
          onClick={onClear}
        >
          <X />
        </button>
      )}
    </div>
  );
});
