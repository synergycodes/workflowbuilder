import { Shape } from '@ui/components/button/types';
import { Size } from '@ui/shared/types/size';
import clsx from 'clsx';
import { ForwardRefExoticComponent, MouseEvent, ReactElement, forwardRef, useState } from 'react';

import borderRadiusStyles from './border-radius-size.module.css';
import styles from './segment-picker.module.css';

import { Item, SegmentPickerItemProps } from './item/segment-picker-item';
import { SegmentPickerContext } from './utils/context';
import { getValidShape } from './utils/get-valid-shape';

type SegmentPickerPropsBase = {
  children: ReactElement<SegmentPickerItemProps, typeof Item>[];
  size?: Size;
  /**
   * Controls the shape of the SegmentPicker and its items.
   * (default) - Items stretch to fill the container equally.
   * 'circle' - Items fit tightly around their content to maintain a circular shape.
   * Only supported when items contain icons only.
   */
  shape?: Shape;
  className?: string;
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void;
};

type ControlledSegmentPickerProps = {
  /** The currently selected value (controlled mode). */
  value: string;
  /** Must not be used in controlled mode. */
  defaultValue?: never;
} & SegmentPickerPropsBase;

type UncontrolledSegmentPickerProps = {
  /** The initial selected value (uncontrolled mode). */
  defaultValue: string;
  /** Must not be used in uncontrolled mode. */
  value?: never;
} & SegmentPickerPropsBase;

type SegmentPickerProps = ControlledSegmentPickerProps | UncontrolledSegmentPickerProps;

type SegmentPickerComponent = ForwardRefExoticComponent<SegmentPickerProps & React.RefAttributes<HTMLDivElement>> & {
  Item: typeof Item;
};

export const SegmentPicker = forwardRef<HTMLDivElement, SegmentPickerProps>(
  ({ children, value, defaultValue, size = 'medium', shape = '', className, onChange }, ref) => {
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
          size,
          shape: validShape,
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
