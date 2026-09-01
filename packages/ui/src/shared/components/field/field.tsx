import { type ReactNode, useId } from 'react';

import styles from './field.module.css';

import type { FieldState } from '../../types/field';

type FieldRenderProps = {
  controlId: string | undefined;
  describedBy: string | undefined;
};

type FieldProps = {
  ariaDescribedBy?: string;
  children: (props: FieldRenderProps) => ReactNode;
  disabled?: boolean;
  helperText?: ReactNode;
  id?: string;
  isRequired?: boolean;
  label?: ReactNode;
  state: FieldState;
};

export function Field({ ariaDescribedBy, children, disabled, helperText, id, isRequired, label, state }: FieldProps) {
  const generatedId = useId();
  const hasLabel = label !== undefined && label !== null && typeof label !== 'boolean';
  const hasHelper = helperText !== undefined && helperText !== null && typeof helperText !== 'boolean';
  const controlId = id ?? generatedId;
  const helperId = hasHelper ? `${controlId}-helper` : undefined;
  const describedBy = [ariaDescribedBy, helperId].filter(Boolean).join(' ') || undefined;
  const control = children({ controlId, describedBy });

  return (
    <div className={styles['field']} data-state={state} data-disabled={disabled || undefined}>
      {hasLabel && (
        <label className={styles['label']} htmlFor={controlId}>
          {label}
          {isRequired && (
            <span className={styles['required']} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {control}
      {hasHelper && (
        <span className={styles['helper']} id={helperId} role={state === 'critical' ? 'alert' : undefined}>
          {helperText}
        </span>
      )}
    </div>
  );
}
