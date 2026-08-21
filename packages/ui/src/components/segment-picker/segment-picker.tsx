import type { NavButtonSize, NavButtonStyle } from '@ui/components/button/nav-button/types';
import type { Shape } from '@ui/components/button/types';
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
import { SegmentPickerContext } from './utils/context';
import { getValidShape } from './utils/get-valid-shape';

const NAV_BUTTON_SIZE_BY_SEGMENT_PICKER_SIZE: Record<Size, NavButtonSize> = {
  'extra-large': 'xl',
  large: 'l',
  medium: 'm',
  small: 's',
  'extra-small': 'xs',
  'xx-small': 'xxs',
  'xxx-small': 'xxxs',
};

const NAV_BUTTON_STYLE_BY_SEGMENT_PICKER_SHAPE: Record<Shape, NavButtonStyle> = {
  default: 'square',
  circle: 'round',
};

export type SegmentPickerPropsBase = {
  children: ReactElement<SegmentPickerItemProps, typeof Item>[];
  /** @default 'medium' */
  size?: Size;
  /**
   * Circle is supported only when every item contains an icon without a label.
   * @default 'default'
   */
  shape?: Shape;
  className?: string;
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void;
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
  ({ children, value, defaultValue, size = 'medium', shape = 'default', className, onChange }, ref) => {
    const validShape = getValidShape(shape, children);
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
    const selectedValue = isControlled ? value : internalValue;

    const handleSelect = (event: MouseEvent<HTMLButtonElement>, newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(event, newValue);
    };

    return (
      <SegmentPickerContext.Provider
        value={{
          selectedValue,
          onSelect: handleSelect,
          size: NAV_BUTTON_SIZE_BY_SEGMENT_PICKER_SIZE[size],
          shape: validShape,
          styleVariant: NAV_BUTTON_STYLE_BY_SEGMENT_PICKER_SHAPE[validShape],
        }}
      >
        <div ref={ref} className={clsx(styles['container'], styles[validShape], borderRadiusStyles[size], className)}>
          {children}
        </div>
      </SegmentPickerContext.Provider>
    );
  },
) as SegmentPickerComponent;

SegmentPicker.Item = Item;
