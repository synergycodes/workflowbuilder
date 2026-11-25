import { NavButton } from '@ui/components/button/nav-button/nav-button';
import type { NavButtonProps } from '@ui/components/button/nav-button/types';
import clsx from 'clsx';
import { type MouseEvent, useContext } from 'react';

import itemShapeStyles from './segment-picker-item-shape.module.css';

import type { BaseButtonProps } from '../../button/types';
import { SegmentPickerContext } from '../utils/context';

/**
 * Props of `SegmentPicker.Item`, one segment of the picker.
 *
 * @category SegmentPicker
 */
export type SegmentPickerItemProps = BaseButtonProps &
  Pick<NavButtonProps, 'prefixIcon' | 'suffixIcon'> & {
    /** Identifies the segment; the picker reports it when the segment is selected. */
    value: string;
  };

export function Item({
  children,
  className,
  onClick,
  prefixIcon,
  suffixIcon,
  value,
  ...buttonProps
}: SegmentPickerItemProps) {
  const context = useContext(SegmentPickerContext);

  if (!context) {
    console.error('SegmentPicker.Item must be used within a SegmentPicker');
    return null;
  }

  const { selectedValue, onSelect, shape, variant, size, navShape } = context;
  const isSelected = selectedValue === value;

  return (
    <NavButton
      aria-pressed={isSelected}
      className={clsx(itemShapeStyles['item'], itemShapeStyles[shape], itemShapeStyles[variant], className)}
      selected={isSelected}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onSelect(value, event);
        onClick?.(event);
      }}
      prefixIcon={prefixIcon}
      shape={navShape}
      size={size}
      suffixIcon={suffixIcon}
      {...buttonProps}
    >
      {children}
    </NavButton>
  );
}
