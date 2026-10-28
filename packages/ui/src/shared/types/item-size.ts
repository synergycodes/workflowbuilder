import type { Size } from './size';

/**
 * Size of `Menu` and `Select` rows, the `Select` trigger and the `DatePicker` input.
 *
 * @category Shared
 */
export type ItemSize = Extract<Size, 'large' | 'medium' | 'small'>;
