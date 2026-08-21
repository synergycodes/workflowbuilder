import { NumberField as NumberFieldBase } from '@base-ui/react/number-field';
import { CaretDown, CaretUp, X } from '@phosphor-icons/react';
import { Field } from '@ui/shared/components/field/field';
import clsx from 'clsx';
import {
  type ClipboardEvent,
  type ForwardedRef,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import styles from './number-field.module.css';
import './variables.css';
import inputSizeStyles from '@ui/shared/styles/field-control-size.module.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';

import type { NumberFieldProps } from './types';

const NUMERAL_PATTERN = /^[\p{N}零〇一二三四五六七八九]+$/u;
const SIGN_PATTERN = /[+＋﹢\-−－‒–—﹣]/u;

function normalizeFinite(value: number | undefined) {
  return value === undefined || !Number.isFinite(value) ? undefined : value;
}

function normalizeStep(step: number | 'any') {
  return step === 'any' || (Number.isFinite(step) && step > 0) ? step : 1;
}

function isValidPastedNumber(value: string) {
  let input = value.trim();
  if (!input) return false;

  const parts = new Intl.NumberFormat().formatToParts(12_345.6);
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  const group = parts.find((part) => part.type === 'group')?.value;
  const characters = [...input];
  const firstIsSign = SIGN_PATTERN.test(characters[0] ?? '');
  const lastIsSign = SIGN_PATTERN.test(characters.at(-1) ?? '');

  if (firstIsSign && lastIsSign && characters.length > 1) return false;
  if (firstIsSign) input = characters.slice(1).join('');
  if (lastIsSign) input = characters.slice(0, -1).join('');
  if (SIGN_PATTERN.test(input)) return false;

  const decimalParts = input.split(decimal);
  if (decimalParts.length > 2) return false;

  const [integer, fraction] = decimalParts;
  if (fraction !== undefined && fraction !== '' && !NUMERAL_PATTERN.test(fraction)) return false;
  if (!integer && !fraction) return false;

  if (!integer) return true;
  if (!group || !integer.includes(group)) return NUMERAL_PATTERN.test(integer);

  const groups = integer.split(group);
  return (
    groups.length > 1 &&
    groups[0].length > 0 &&
    groups[0].length <= 3 &&
    groups.every((part, index) => NUMERAL_PATTERN.test(part) && (index === 0 || part.length === 3))
  );
}

function setRef(ref: ForwardedRef<HTMLInputElement>, value: HTMLInputElement | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

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
  const normalizedValue = value == null || Number.isFinite(value) ? value : null;
  const normalizedDefaultValue = defaultValue == null ? undefined : normalizeFinite(defaultValue);
  const normalizedMin = normalizeFinite(min);
  const normalizedMax = normalizeFinite(max);
  const normalizedStep = normalizeStep(step);
  const isReadOnly = !disabled && (state === 'read-only' || readOnly === true);
  const fieldState = disabled && state === 'read-only' ? 'default' : isReadOnly ? 'read-only' : state;
  const isNativeRequired = required || isRequired;
  const visibleInputRef = useRef<HTMLInputElement | null>(null);
  const restoreFocusRef = useRef(false);
  const lastReportedValueRef = useRef<number | null | undefined>(undefined);
  const pendingControlledValueRef = useRef<number | null | undefined>(undefined);
  const [resetVersion, setResetVersion] = useState(0);
  const [proposalVersion, setProposalVersion] = useState(0);
  const isControlled = value !== undefined;
  const maxIsOffStep =
    typeof normalizedStep === 'number' &&
    normalizedMax !== undefined &&
    Math.abs(
      (normalizedMax - (normalizedMin ?? 0)) / normalizedStep -
        Math.round((normalizedMax - (normalizedMin ?? 0)) / normalizedStep),
    ) > 1e-10;
  const setVisibleInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      visibleInputRef.current = element;
      setRef(ref, element);
    },
    [ref],
  );
  const setHiddenInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      if (element) element.step = maxIsOffStep || normalizedStep === 'any' ? 'any' : String(normalizedStep);
    },
    [maxIsOffStep, normalizedStep],
  );

  useLayoutEffect(() => {
    if (pendingControlledValueRef.current === undefined) return;

    const proposedValue = pendingControlledValueRef.current;
    pendingControlledValueRef.current = undefined;
    if (!Object.is(normalizedValue, proposedValue)) setResetVersion((current) => current + 1);
  }, [normalizedValue, proposalVersion]);

  useLayoutEffect(() => {
    if (!restoreFocusRef.current) return;

    restoreFocusRef.current = false;
    visibleInputRef.current?.focus();
  }, [resetVersion]);

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(event);
    if (event.defaultPrevented) return;

    const pastedText = event.clipboardData.getData('text/plain');
    const selectionStart = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
    const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
    const nextText =
      event.currentTarget.value.slice(0, selectionStart) + pastedText + event.currentTarget.value.slice(selectionEnd);

    if (!isValidPastedNumber(nextText)) event.preventDefault();
  };

  return (
    <Field
      id={id}
      label={label}
      helperText={helperText}
      isRequired={isNativeRequired}
      state={fieldState}
      ariaDescribedBy={ariaDescribedBy}
    >
      {({ controlId, describedBy }) => (
        <NumberFieldBase.Root
          key={resetVersion}
          value={normalizedValue}
          defaultValue={normalizedDefaultValue}
          min={normalizedMin}
          max={normalizedMax}
          step={normalizedStep}
          disabled={disabled}
          readOnly={isReadOnly}
          id={controlId}
          name={name}
          form={form}
          required={isNativeRequired}
          inputRef={setHiddenInputRef}
          onValueChange={(nextValue, details) => {
            if (nextValue !== null && !Number.isFinite(nextValue)) {
              details.cancel();
              return;
            }
            if (details.reason === 'input-blur' && Object.is(lastReportedValueRef.current, nextValue)) return;

            onValueChange?.(nextValue, details);
            if (details.isCanceled) {
              if (isControlled) {
                restoreFocusRef.current = document.activeElement === visibleInputRef.current;
                setResetVersion((current) => current + 1);
              }
              return;
            }

            lastReportedValueRef.current = nextValue;
            if (isControlled) {
              pendingControlledValueRef.current = nextValue;
              restoreFocusRef.current = document.activeElement === visibleInputRef.current;
              setProposalVersion((current) => current + 1);
            }
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
            <NumberFieldBase.Input
              {...props}
              ref={setVisibleInputRef}
              onPaste={handlePaste}
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
      )}
    </Field>
  );
});
