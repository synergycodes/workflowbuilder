import { Select as SelectBase } from '@base-ui/react/select';
import { FIELD_CONTROL_SIZE_BY_ITEM_SIZE } from '@ui/shared/styles/field-control-size';
import clsx from 'clsx';
import type { ReactNode, SyntheticEvent } from 'react';

import selectButtonStyles from './select-button/select-button.module.css';
import style from './select.module.css';
import fieldControlSizeStyles from '@ui/shared/styles/field-control-size.module.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import listBoxStyles from '@ui/shared/styles/list-box.module.css';

import { Field } from '../../shared/components/field/field';
import type { FieldState } from '../../shared/types/field';
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
   * @default 'medium'
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
   * @default false
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
  /**
   * Label rendered above the control and linked to it.
   */
  label?: ReactNode;
  /**
   * Message rendered under the control and announced with it.
   */
  helperText?: ReactNode;
  /**
   * Visual state of the control.
   * @default 'default'
   */
  state?: FieldState;
  /**
   * Adds the required marker next to the label.
   */
  isRequired?: boolean;
  /**
   * Identifies the control; a generated id is used when omitted.
   */
  id?: string;
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
  label,
  helperText,
  state = 'default',
  isRequired,
  id,
}: SelectBaseProps) {
  const fieldState: FieldState = error ? 'critical' : state;
  const triggerClassName = clsx(
    selectButtonStyles['container'],
    {
      [selectButtonStyles['container--error']]: error,
    },
    inputFontStyles[size],
    fieldControlSizeStyles[FIELD_CONTROL_SIZE_BY_ITEM_SIZE[size]],
    className,
  );

  return (
    <Field
      id={id}
      label={label}
      helperText={helperText}
      isRequired={isRequired ?? required}
      state={fieldState}
      disabled={disabled}
    >
      {({ controlId, describedBy, required: isFieldRequired }) => (
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
            <SelectBase.Trigger
              id={controlId}
              aria-describedby={describedBy}
              aria-required={isFieldRequired}
              aria-invalid={fieldState === 'critical' || undefined}
              className={triggerClassName}
              render={<SelectButton />}
            >
              <SelectBase.Value>
                {(currentValue) => (
                  <SelectValue value={currentValue as SelectValueType} items={items} placeholder={placeholder} />
                )}
              </SelectBase.Value>
            </SelectBase.Trigger>
            <SelectBase.Portal>
              <SelectBase.Positioner
                className={clsx(listBoxStyles['popup'], style['popup'])}
                alignItemWithTrigger={false}
              >
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
      )}
    </Field>
  );
}
