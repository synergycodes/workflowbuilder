import { NavButton } from '@ui/components/button/nav-button/nav-button';
import type { NavButtonProps } from '@ui/components/button/nav-button/types';
import clsx from 'clsx';
import { Children, type MouseEvent, type ReactNode, isValidElement, useContext } from 'react';

import itemShapeStyles from './segment-picker-item-shape.module.css';

import type { BaseButtonProps, IconNode } from '../../button/types';
import { SegmentPickerContext } from '../utils/context';

export type SegmentPickerItemProps = BaseButtonProps &
  Pick<NavButtonProps, 'prefixIcon' | 'suffixIcon'> & {
    value: string;
  };

type Slots = { prefixIcon?: IconNode; label?: ReactNode; suffixIcon?: IconNode };

function toSlots(children: ReactNode): Slots {
  const parts = Children.toArray(children);
  const prefixIcon = isValidElement(parts[0]) ? parts[0] : undefined;
  const last = parts.at(-1);
  const suffixIcon = parts.length > 1 && isValidElement(last) ? last : undefined;
  const labelParts = parts.slice(prefixIcon ? 1 : 0, suffixIcon ? -1 : undefined);

  return { prefixIcon, label: labelParts.length > 0 ? labelParts : undefined, suffixIcon };
}

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

  const { selectedValue, onSelect, shape, size, navVariant } = context;
  const slots = toSlots(children);
  const isSelected = selectedValue === value;

  return (
    <NavButton
      aria-pressed={isSelected}
      className={clsx(itemShapeStyles['item'], itemShapeStyles[shape], className)}
      isSelected={isSelected}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onSelect(event, value);
        onClick?.(event);
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
