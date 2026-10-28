import type { FieldControlProps } from '@ui/shared/types/field';
import type { InputHTMLAttributes } from 'react';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & FieldControlProps;
