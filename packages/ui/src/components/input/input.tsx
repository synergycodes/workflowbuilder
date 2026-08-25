import { Input as InputBase } from '@base-ui/react/input';
import { X } from '@phosphor-icons/react';
import { Field } from '@ui/shared/components/field/field';
import clsx from 'clsx';
import { forwardRef } from 'react';

import inputRootStyles from './input-root.module.css';
import inputStyles from './input.module.css';
import './variables.css';
import inputHeightStyles from '@ui/shared/styles/field-control-height.module.css';
import inputSizeStyles from '@ui/shared/styles/field-control-size.module.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';

import type { InputProps } from './types';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = 'm',
    state = 'default',
    prefixIcon,
    suffixIcon,
    onClear,
    label,
    helperText,
    isRequired,
    className,
    disabled,
    readOnly,
    id,
    required,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const isReadOnly = !disabled && (state === 'read-only' || readOnly === true);
  const fieldState = disabled && state === 'read-only' ? 'default' : isReadOnly ? 'read-only' : state;
  const isNativeRequired = required || isRequired;

  return (
    <Field
      id={id}
      label={label}
      helperText={helperText}
      isRequired={isNativeRequired}
      state={fieldState}
      disabled={disabled}
      ariaDescribedBy={ariaDescribedBy}
    >
      {({ controlId, describedBy }) => (
        <div
          className={clsx(inputRootStyles['input-root'], inputHeightStyles[size], inputSizeStyles[size], className)}
          data-state={fieldState}
          data-disabled={disabled || undefined}
          onPointerDown={(event) => {
            if (
              !(event.target instanceof Element) ||
              event.target.closest('button, a, input, select, textarea, [tabindex]')
            )
              return;
            event.preventDefault();
            event.currentTarget.querySelector('input')?.focus();
          }}
        >
          {prefixIcon && <span className={inputRootStyles['icon']}>{prefixIcon}</span>}
          <InputBase
            {...props}
            ref={ref}
            id={controlId}
            disabled={disabled}
            readOnly={isReadOnly}
            required={isNativeRequired}
            aria-describedby={describedBy}
            aria-invalid={fieldState === 'critical' ? true : ariaInvalid}
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
      )}
    </Field>
  );
});
