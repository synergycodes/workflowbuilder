import type { Shape } from '@ui/components/button/types';
import { type ReactElement, isValidElement } from 'react';

import { Item, type SegmentPickerItemProps } from '../item/segment-picker-item';

export function getValidShape(shape: Shape, items: ReactElement<SegmentPickerItemProps, typeof Item>[]): Shape {
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
