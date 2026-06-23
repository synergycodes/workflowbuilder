import { Select as SelectBase } from '@base-ui/react/select';
import clsx from 'clsx';
import type { SyntheticEvent } from 'react';

import selectButtonStyles from './select-button/select-button.module.css';
import style from './select.module.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import inputSizeStyles from '@ui/shared/styles/input-size.module.css';
import listBoxStyles from '@ui/shared/styles/list-box.module.css';

import type { ItemSize } from '../../shared/types/item-size';
import { Separator } from '../separator/separator';
import { SelectButton } from './select-button/select-button';
import { SelectOption } from './select-option/select-option';
import { SelectValue } from './select-value/select-value';
import type { SelectItem } from './types';

type SelectValueType = string | number | null;

export type SelectBaseProps = {
  /**
   * Custom class name for the component.
   */
  className?: string;
  /**
   * Size of the select input
   */
  size?: ItemSize;
  /**
   * Placeholder text for the select input
   */
  placeholder?: string;
  /**
   * List of items to display in the select dropdown
   */
  items: SelectItem[];
  /**
   * Whether the select has an error
   */
  error?: boolean;
  /**
   * The controlled value of the select.
   */
  value?: SelectValueType;
  /**
   * The default value of the select when uncontrolled.
   */
  defaultValue?: SelectValueType;
  /**
   * Callback fired when the value of the select changes.
   */
  onChange?: (event: SyntheticEvent | Event | null, value: SelectValueType) => void;
  /**
   * Whether the select is disabled.
   */
  disabled?: boolean;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required?: boolean;
};

/**
 * Component for displaying a select dropdown with customizable size, placeholder, and item list
 */
export function Select({
  className,
  size = 'medium',
  items,
  placeholder,
  error = false,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  required,
}: SelectBaseProps) {
  const triggerClassName = clsx(
    selectButtonStyles['container'],
    {
      [selectButtonStyles['container--error']]: error,
    },
    inputFontStyles[size],
    inputSizeStyles[size],
    className,
  );

  return (
    <div className={style['container']}>
      <SelectBase.Root
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        required={required}
        onValueChange={(nextValue, eventDetails) => {
          onChange?.(eventDetails.event ?? null, nextValue as SelectValueType);
        }}
      >
        <SelectBase.Trigger className={triggerClassName} render={<SelectButton />}>
          <SelectBase.Value>
            {(currentValue) => (
              <SelectValue value={currentValue as SelectValueType} items={items} placeholder={placeholder} />
            )}
          </SelectBase.Value>
        </SelectBase.Trigger>
        <SelectBase.Portal>
          <SelectBase.Positioner className={clsx(listBoxStyles['popup'], style['popup'])} alignItemWithTrigger={false}>
            <SelectBase.Popup className={listBoxStyles['list-box']}>
              {items.map((item, index) =>
                item.type === 'separator' ? (
                  <Separator key={index} />
                ) : (
                  <SelectOption key={item.value} {...item} size={size} />
                ),
              )}
            </SelectBase.Popup>
          </SelectBase.Positioner>
        </SelectBase.Portal>
      </SelectBase.Root>
    </div>
  );
}
