import type { Size } from './size';

/**
 * Size of a row in a `Menu` or `Select` list: a subset of `Size`.
 *
 * @category Shared
 */
export type ItemSize = Extract<Size, 'large' | 'medium' | 'small'>;
