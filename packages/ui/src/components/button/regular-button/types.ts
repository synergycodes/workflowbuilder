import { SIZES, Size } from '../../../shared/types/size';
import { rangeBetween } from '../../../shared/utils/arrays';
import { BaseButtonProps } from '../types';

export const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'gray',
  'error',
  'warning',
  'success',
  'ghost-destructive',
] as const;

export const BUTTON_SIZES = rangeBetween(SIZES, 'extra-small', 'extra-large');

export type ButtonSize = Extract<Size, 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large'>;

export type Variant = (typeof BUTTON_VARIANTS)[number];

export type BaseRegularButtonProps = BaseButtonProps & {
  variant?: Variant;
  size?: ButtonSize;
};
