import type { ReactNode } from 'react';

export const FIELD_STATES = ['default', 'critical', 'success', 'read-only'] as const;
export const FIELD_SIZES = ['l', 'm', 's', 'xs'] as const;

export type FieldState = (typeof FIELD_STATES)[number];
export type FieldSize = (typeof FIELD_SIZES)[number];

export type FieldControlProps = {
  /**
   * The read-only state also applies the native read-only behavior.
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
};
