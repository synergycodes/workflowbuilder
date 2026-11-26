export const SIZES = ['xxxs', 'xxs', 'xs', 's', 'm', 'l', 'xl'] as const;
/**
 * The size scale that `ItemSize`, `SelectorSize`, `EdgeLabelSize` and `SegmentPicker` take their sizes from.
 *
 * @category Shared
 */
export type Size = (typeof SIZES)[number];
