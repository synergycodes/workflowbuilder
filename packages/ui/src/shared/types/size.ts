export const SIZES = ['xxx-small', 'xx-small', 'extra-small', 'small', 'medium', 'large', 'extra-large'] as const;
export type Size = (typeof SIZES)[number];
