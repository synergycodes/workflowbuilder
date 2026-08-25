import { NumberField as NumberFieldBase } from '@base-ui/react/number-field';
import { CaretDown, CaretUp, X } from '@phosphor-icons/react';
import { Field } from '@ui/shared/components/field/field';
import clsx from 'clsx';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import styles from './number-field.module.css';
import './variables.css';
import inputHeightStyles from '@ui/shared/styles/field-control-height.module.css';
import inputSizeStyles from '@ui/shared/styles/field-control-size.module.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';

import {
  clearNumberInput,
  getSteppingMax,
  handleNumberPaste,
  normalizeFinite,
  normalizeStep,
} from './number-field.utils';
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
    label,
    helperText,
    isRequired,
    className,
    disabled,
    readOnly,
    id,
    name,
    form,
    required,
    onPaste,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const [normalizedMin, normalizedMax] = [normalizeFinite(min), normalizeFinite(max)];
  const normalizedStep = normalizeStep(step);
  const steppingMax = getSteppingMax(normalizedMin, normalizedMax, normalizedStep);
  const isReadOnly = !disabled && (state === 'read-only' || readOnly === true);
  const fieldState = disabled && state === 'read-only' ? 'default' : isReadOnly ? 'read-only' : state;
  const visibleInputRef = useRef<HTMLInputElement | null>(null);
  useImperativeHandle(ref, () => visibleInputRef.current as HTMLInputElement);

  return (
    <Field
      id={id}
      label={label}
      helperText={helperText}
      isRequired={required || isRequired}
      state={fieldState}
      disabled={disabled}
      ariaDescribedBy={ariaDescribedBy}
    >
      {({ controlId, describedBy }) => (
        <NumberFieldBase.Root
          className={className}
          value={value == null || Number.isFinite(value) ? value : null}
          defaultValue={defaultValue == null ? undefined : normalizeFinite(defaultValue)}
          min={normalizedMin}
          max={steppingMax}
          allowOutOfRange={steppingMax !== normalizedMax}
          step={normalizedStep}
          snapOnStep={normalizedStep !== 'any'}
          disabled={disabled}
          readOnly={isReadOnly}
          id={controlId}
          name={name}
          form={form}
          required={required || isRequired}
          inputRef={(element) => {
            if (!element) return;
            if (normalizedMax === undefined) element.removeAttribute('max');
            else element.max = String(normalizedMax);
          }}
          onValueChange={(nextValue, details) =>
            onValueChange?.(nextValue === null || Number.isFinite(nextValue) ? nextValue : null, details)
          }
        >
          <NumberFieldBase.Group
            className={clsx(styles['number-field'], styles[size], inputHeightStyles[size], inputSizeStyles[size])}
            data-state={fieldState}
            data-field-disabled={disabled || undefined}
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
            {prefixIcon && <span className={styles['icon']}>{prefixIcon}</span>}
            <NumberFieldBase.Input
              {...props}
              ref={visibleInputRef}
              onPaste={(event) => handleNumberPaste(event, onPaste)}
              aria-describedby={describedBy}
              aria-invalid={fieldState === 'critical' ? true : ariaInvalid}
              className={clsx(styles['input'], inputFontStyles[size])}
            />
            {suffixIcon && <span className={styles['icon']}>{suffixIcon}</span>}
            {onClear && (
              <button
                type="button"
                className={styles['clear']}
                aria-label="Clear number field"
                disabled={disabled || isReadOnly}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  clearNumberInput(visibleInputRef.current);
                  onClear();
                }}
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
      )}
    </Field>
  );
});
