import { Shape } from '@ui/components/button/types';
import { ReactElement } from 'react';

import { hasIconChildrenOnly } from '../../button/guards';
import { Item, SegmentPickerItemProps } from '../item/segment-picker-item';

export function getValidShape(shape: Shape, items: ReactElement<SegmentPickerItemProps, typeof Item>[]): Shape {
  if (shape !== 'circle') {
    return shape;
  }

  const everyItemHasOnlyIcon = items.every((item) => hasIconChildrenOnly({ children: item.props.children }));

  if (!everyItemHasOnlyIcon) {
    console.error(
      '[SegmentPicker] The "circle" shape can only be used when all SegmentPicker.Item components contain icon-only children.',
    );
    return '';
  }

  return shape;
}
