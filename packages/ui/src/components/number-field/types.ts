import type { NumberFieldRootChangeEventDetails } from '@base-ui/react/number-field';
import type { FieldControlProps } from '@ui/shared/types/field';
import type { InputHTMLAttributes } from 'react';

/**
 * Uses the runtime locale with decimal formatting. Explicit locale and format options are reserved for a future API.
 */
export type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'defaultValue' | 'max' | 'min' | 'size' | 'step' | 'type' | 'value'
> &
  FieldControlProps & {
    value?: number | null;
    defaultValue?: number | null;
    onValueChange?: (value: number | null, details: NumberFieldRootChangeEventDetails) => void;
    min?: number;
    max?: number;
    /**
     * @default 1
     */
    step?: number | 'any';
  };
