import { X } from '@phosphor-icons/react';
import { Field } from '@ui/shared/components/field/field';
import type { FieldControlProps } from '@ui/shared/types/field';
import clsx from 'clsx';
import { type ComponentPropsWithoutRef, type TextareaHTMLAttributes, forwardRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import styles from './text-area.module.css';
import inputSizeStyles from '@ui/shared/styles/field-control-size.module.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';

export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'style'> &
  FieldControlProps & {
    maxRows?: number;
    minRows?: number;
    style?: ComponentPropsWithoutRef<typeof TextareaAutosize>['style'];
  };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    size = 'm',
    state = 'default',
    prefixIcon,
    suffixIcon,
    onClear,
    label,
    helperText,
    isRequired,
    maxRows,
    minRows,
    disabled,
    readOnly,
    className,
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
      ariaDescribedBy={ariaDescribedBy}
    >
      {({ controlId, describedBy }) => (
        <div
          className={clsx(styles['text-area-container'], styles[`size-${size}`], inputSizeStyles[size], className)}
          data-state={fieldState}
          data-disabled={disabled || undefined}
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            event.currentTarget.querySelector('textarea')?.focus();
          }}
        >
          {prefixIcon && <span className={styles['icon']}>{prefixIcon}</span>}
          <TextareaAutosize
            {...props}
            ref={ref}
            id={controlId}
            minRows={minRows}
            maxRows={maxRows}
            disabled={disabled}
            readOnly={isReadOnly}
            required={isNativeRequired}
            aria-describedby={describedBy}
            aria-invalid={fieldState === 'critical' ? true : ariaInvalid}
            className={clsx(styles['text-area'], inputFontStyles[size])}
          />
          {suffixIcon && <span className={styles['icon']}>{suffixIcon}</span>}
          {onClear && (
            <button
              type="button"
              className={styles['clear']}
              aria-label="Clear text area"
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
