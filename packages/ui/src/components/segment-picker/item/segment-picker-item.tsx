import { NavButton } from '@ui/components/button/nav-button/nav-button';
import type { NavButtonProps } from '@ui/components/button/nav-button/types';
import clsx from 'clsx';
import { type MouseEvent, type ReactNode, isValidElement, useContext } from 'react';

import itemShapeStyles from './segment-picker-item-shape.module.css';

import type { BaseButtonProps } from '../../button/types';
import { SegmentPickerContext } from '../utils/context';

export type SegmentPickerItemProps = BaseButtonProps &
  Pick<NavButtonProps, 'prefixIcon' | 'suffixIcon'> & {
    value: string;
  };

type Slots = { prefixIcon?: ReactNode; label?: ReactNode; suffixIcon?: ReactNode };

function toSlots(children: ReactNode): Slots {
  if (Array.isArray(children)) {
    const parts = children.filter((child) => child != null && child !== false);
    const prefixIcon = isValidElement(parts[0]) ? parts[0] : undefined;
    const last = parts.at(-1);
    const suffixIcon = parts.length > 1 && isValidElement(last) ? last : undefined;
    const label = parts.filter((child) => !isValidElement(child));

    return { prefixIcon, label: label.length > 0 ? label : undefined, suffixIcon };
  }

  return isValidElement(children) ? { prefixIcon: children } : { label: children };
}

export function Item({ children, className, prefixIcon, suffixIcon, value, ...buttonProps }: SegmentPickerItemProps) {
  const context = useContext(SegmentPickerContext);

  if (!context) {
    console.error('SegmentPicker.Item must be used within a SegmentPicker');
    return null;
  }

  const { selectedValue, onSelect, shape, size, navVariant } = context;
  const slots = toSlots(children);
  const isSelected = selectedValue === value;

  return (
    <NavButton
      aria-pressed={isSelected}
      className={clsx(itemShapeStyles['item'], itemShapeStyles[shape], className)}
      isSelected={isSelected}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (isSelected) return;
        onSelect(event, value);
      }}
      prefixIcon={prefixIcon ?? slots.prefixIcon}
      size={size}
      variant={navVariant}
      suffixIcon={suffixIcon ?? slots.suffixIcon}
      {...buttonProps}
    >
      {slots.label}
    </NavButton>
  );
}
