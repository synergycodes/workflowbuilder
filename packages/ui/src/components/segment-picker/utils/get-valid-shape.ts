import { type ReactElement, isValidElement } from 'react';

import { Item, type SegmentPickerItemProps } from '../item/segment-picker-item';
import type { SegmentPickerShape } from '../types';

export function getValidShape(
  shape: SegmentPickerShape,
  items: ReactElement<SegmentPickerItemProps, typeof Item>[],
): SegmentPickerShape {
  if (shape !== 'circle') {
    return shape;
  }

  const everyItemHasOnlyIcon = items.every(({ props }) => {
    const hasExplicitIcon = props.prefixIcon != null && props.children == null && props.suffixIcon == null;
    const hasLegacyIconChild = props.prefixIcon == null && isValidElement(props.children) && props.suffixIcon == null;

    return hasExplicitIcon || hasLegacyIconChild;
  });

  if (!everyItemHasOnlyIcon) {
    console.error('[SegmentPicker] The "circle" shape can only be used when all items contain only a prefix icon.');
    return 'default';
  }

  return shape;
}
