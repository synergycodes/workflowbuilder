export const SIZES = ['xxx-small', 'xx-small', 'extra-small', 'small', 'medium', 'large', 'extra-large'] as const;
/**
 * The size scale shared by the components. Each component accepts a subset of it.
 *
 * @category Shared
 */
export type Size = (typeof SIZES)[number];
