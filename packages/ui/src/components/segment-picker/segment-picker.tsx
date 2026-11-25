import type { NavButtonShape } from '@ui/components/button/nav-button/types';
import type { Size } from '@ui/shared/types/size';
import clsx from 'clsx';
import {
  type ForwardRefExoticComponent,
  type MouseEvent,
  type ReactElement,
  type RefAttributes,
  forwardRef,
  useState,
} from 'react';

import borderRadiusStyles from './border-radius-size.module.css';
import styles from './segment-picker.module.css';

import { Item, type SegmentPickerItemProps } from './item/segment-picker-item';
import type { SegmentPickerShape, SegmentPickerVariant } from './types';
import { SegmentPickerContext } from './utils/context';
import { getValidShape } from './utils/get-valid-shape';

const NAV_BUTTON_SHAPE_BY_SEGMENT_PICKER_SHAPE: Record<SegmentPickerShape, NavButtonShape> = {
  default: 'square',
  round: 'round',
};

export type SegmentPickerPropsBase = {
  children: ReactElement<SegmentPickerItemProps, typeof Item>[];
  /** @default 'm' */
  size?: Size;
  /**
   * Round is supported only when every item contains an icon without a label.
   * @default 'default'
   */
  shape?: SegmentPickerShape;
  /** @default 'primary' */
  variant?: SegmentPickerVariant;
  className?: string;
  onValueChange?: (value: string, event: MouseEvent<HTMLButtonElement>) => void;
};

export type ControlledSegmentPickerProps = {
  value: string;
  defaultValue?: never;
} & SegmentPickerPropsBase;

export type UncontrolledSegmentPickerProps = {
  defaultValue: string;
  value?: never;
} & SegmentPickerPropsBase;

export type SegmentPickerProps = ControlledSegmentPickerProps | UncontrolledSegmentPickerProps;

type SegmentPickerComponent = ForwardRefExoticComponent<SegmentPickerProps & RefAttributes<HTMLDivElement>> & {
  Item: typeof Item;
};

export const SegmentPicker = forwardRef<HTMLDivElement, SegmentPickerProps>(
  (
    { children, value, defaultValue, size = 'm', shape = 'default', variant = 'primary', className, onValueChange },
    ref,
  ) => {
    const validShape = getValidShape(shape, children);
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
    const selectedValue = isControlled ? value : internalValue;

    const handleSelect = (newValue: string, event: MouseEvent<HTMLButtonElement>) => {
      if (newValue === selectedValue) return;

      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue, event);
    };

    return (
      <SegmentPickerContext.Provider
        value={{
          selectedValue,
          onSelect: handleSelect,
          size,
          shape: validShape,
          variant,
          navShape: NAV_BUTTON_SHAPE_BY_SEGMENT_PICKER_SHAPE[validShape],
        }}
      >
        <div
          ref={ref}
          className={clsx(
            styles['container'],
            styles[validShape],
            styles[variant],
            borderRadiusStyles[size],
            className,
          )}
        >
          {children}
        </div>
      </SegmentPickerContext.Provider>
    );
  },
) as SegmentPickerComponent;

SegmentPicker.Item = Item;
