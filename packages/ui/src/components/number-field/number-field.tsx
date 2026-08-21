import { NumberField as NumberFieldBase } from '@base-ui/react/number-field';
import { CaretDown, CaretUp, X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { forwardRef } from 'react';

import styles from './number-field.module.css';
import './variables.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import inputSizeStyles from '@ui/shared/styles/input-size.module.css';

import type { NumberFieldProps } from './types';

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    step = 1,
    size = 'm',
    state = 'default',
    prefixIcon,
    suffixIcon,
    onClear,
    className,
    disabled,
    readOnly,
    id,
    name,
    form,
    required,
    ...props
  },
  ref,
) {
  const isReadOnly = state === 'read-only' || readOnly === true;
  const fieldState = isReadOnly ? 'read-only' : state;

  return (
    <NumberFieldBase.Root
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      readOnly={isReadOnly}
      id={id}
      name={name}
      form={form}
      required={required}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange?.(nextValue);
      }}
    >
      <NumberFieldBase.Group
        className={clsx(styles['number-field'], styles[size], inputSizeStyles[size], className)}
        data-field-state={fieldState}
        data-field-disabled={disabled || undefined}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          event.currentTarget.querySelector('input')?.focus();
        }}
      >
        {prefixIcon && <span className={styles['icon']}>{prefixIcon}</span>}
        <NumberFieldBase.Input {...props} ref={ref} className={clsx(styles['input'], inputFontStyles[size])} />
        {suffixIcon && <span className={styles['icon']}>{suffixIcon}</span>}
        {onClear && (
          <button
            type="button"
            className={styles['clear']}
            aria-label="Clear number field"
            disabled={disabled || isReadOnly}
            onPointerDown={(event) => event.preventDefault()}
            onClick={onClear}
          >
            <X />
          </button>
        )}
        <span className={styles['stepper']}>
          <NumberFieldBase.Increment className={styles['stepper-button']} aria-label="Increment value">
            <CaretUp />
          </NumberFieldBase.Increment>
          <NumberFieldBase.Decrement
            className={clsx(styles['stepper-button'], styles['decrement'])}
            aria-label="Decrement value"
          >
            <CaretDown />
          </NumberFieldBase.Decrement>
        </span>
      </NumberFieldBase.Group>
    </NumberFieldBase.Root>
  );
});
