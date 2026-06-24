import {
  hasChildrenWithStringAndIcons,
  hasIconChildrenOnly,
  hasStringChildrenOnly,
} from '@ui/components/button/guards';
import { NavButton } from '@ui/components/button/nav-button/nav-button';
import { NavIconButtonProps } from '@ui/components/button/nav-button/nav-icon-button/nav-icon-button';
import { NavIconLabelButtonProps } from '@ui/components/button/nav-button/nav-icon-label-button/nav-icon-label-button';
import { NavLabelButtonProps } from '@ui/components/button/nav-button/nav-label-button/nav-label-button';
import clsx from 'clsx';
import { MouseEventHandler, useContext } from 'react';

import itemShapeStyles from './segment-picker-item-shape.module.css';

import { BaseButtonProps } from '../../button/types';
import { SegmentPickerContext } from '../utils/context';

export type SegmentPickerItemProps = BaseButtonProps & {
  value: string;
} & (
    | Pick<NavLabelButtonProps, 'children'>
    | Pick<NavIconButtonProps, 'children'>
    | Pick<NavIconLabelButtonProps, 'children'>
  );

/**
 * A single item in the SegmentPicker, rendered as a NavButton under the hood.
 *
 * Automatically receives size and shape from SegmentPicker context.
 * Must be used only within a SegmentPicker component.
 *
 * Determines which NavButton variant to render based on its children
 * (label only, icon only, or icon + label).
 */
export function Item({ children, value, ...buttonProps }: SegmentPickerItemProps) {
  const context = useContext(SegmentPickerContext);

  if (!context) {
    console.error('SegmentPicker.Item must be used within a SegmentPicker');
    return null;
  }

  const { selectedValue, onSelect, shape, ...other } = context;

  const props = {
    className: clsx(itemShapeStyles['item'], itemShapeStyles[shape || '']),
    isSelected: selectedValue === value,
    onClick: (event: MouseEventHandler<HTMLButtonElement>) => onSelect(event, value),
    shape,
    children,
    ...other,
    ...buttonProps,
  };

  if (hasStringChildrenOnly<NavLabelButtonProps>(props)) {
    return <NavButton {...props} />;
  }

  if (hasIconChildrenOnly<NavIconButtonProps>(props)) {
    return <NavButton {...props} />;
  }

  if (hasChildrenWithStringAndIcons<NavIconLabelButtonProps>(props)) {
    return <NavButton {...props} />;
  }

  return null;
}
