import type { ReactNode } from 'react';

export const FIELD_STATES = ['default', 'critical', 'success', 'read-only'] as const;
export const FIELD_SIZES = ['l', 'm', 's', 'xs'] as const;

export type FieldState = (typeof FIELD_STATES)[number];
export type FieldSize = (typeof FIELD_SIZES)[number];

export type FieldControlProps = {
  /**
   * Disabled controls take precedence over the read-only state.
   * @default 'default'
   */
  state?: FieldState;
  /**
   * @default 'm'
   */
  size?: FieldSize;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  /** Renders a clear affordance that invokes this callback. */
  onClear?: () => void;
  /** Accessible name for the clear affordance rendered when `onClear` is provided. */
  clearLabel?: string;
  label?: ReactNode;
  helperText?: ReactNode;
  isRequired?: boolean;
};
