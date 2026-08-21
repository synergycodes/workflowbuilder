import type { FieldControlProps } from '@ui/shared/types/field';
import type { InputHTMLAttributes } from 'react';

export type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'defaultValue' | 'max' | 'min' | 'size' | 'step' | 'type' | 'value'
> &
  FieldControlProps & {
    value?: number;
    defaultValue?: number;
    onValueChange?: (value: number) => void;
    min?: number;
    max?: number;
    /**
     * @default 1
     */
    step?: number;
  };
