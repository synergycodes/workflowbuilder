import { NavButton } from '@ui/components/button/nav-button/nav-button';
import type { NavButtonProps } from '@ui/components/button/nav-button/types';
import clsx from 'clsx';
import { type MouseEvent, isValidElement, useContext } from 'react';

import itemShapeStyles from './segment-picker-item-shape.module.css';

import type { BaseButtonProps } from '../../button/types';
import { SegmentPickerContext } from '../utils/context';

export type SegmentPickerItemProps = BaseButtonProps &
  Pick<NavButtonProps, 'prefixIcon' | 'suffixIcon'> & {
    value: string;
  };

export function Item({ children, className, prefixIcon, suffixIcon, value, ...buttonProps }: SegmentPickerItemProps) {
  const context = useContext(SegmentPickerContext);

  if (!context) {
    console.error('SegmentPicker.Item must be used within a SegmentPicker');
    return null;
  }

  const { selectedValue, onSelect, shape, size, styleVariant } = context;
  const hasLegacyIconChild = prefixIcon == null && suffixIcon == null && isValidElement(children);

  return (
    <NavButton
      className={clsx(itemShapeStyles['item'], itemShapeStyles[shape], className)}
      isSelected={selectedValue === value}
      onClick={(event: MouseEvent<HTMLButtonElement>) => onSelect(event, value)}
      prefixIcon={hasLegacyIconChild ? children : prefixIcon}
      size={size}
      styleVariant={styleVariant}
      suffixIcon={suffixIcon}
      {...buttonProps}
    >
      {hasLegacyIconChild ? undefined : children}
    </NavButton>
  );
}
