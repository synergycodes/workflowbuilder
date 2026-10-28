export const SIZES = ['xxx-small', 'xx-small', 'extra-small', 'small', 'medium', 'large', 'extra-large'] as const;
/**
 * The size scale that `ItemSize`, `SelectorSize`, `EdgeLabelSize` and `SegmentPicker` take their sizes from.
 *
 * @category Shared
 */
export type Size = (typeof SIZES)[number];
