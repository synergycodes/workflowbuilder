import type { ItemSize } from '@ui/shared/types/item-size';

/**
 * The picker type.
 *
 * - `default`: select a single date.
 * - `range`: select a date range (`[from, to]`).
 * - `multiple`: select an arbitrary array of dates.
 */
export type DatePickerType = 'default' | 'range' | 'multiple';

/**
 * The set of value shapes accepted by the date picker, depending on the
 * picker type.
 *
 * - `default` -> `Date | string`
 * - `range`   -> `[Date, Date]`
 * - `multiple`-> `Date[]`
 *
 * `string` is accepted for `default` for backwards compatibility (parsed via
 * the `Date` constructor) and `null`/`undefined` represent "no selection".
 */
export type DatePickerValue = Date | [Date, Date] | Date[] | string | null | undefined;

/**
 * Public props of the {@link DatePicker} component.
 *
 * The previous, Mantine-based implementation accepted the full
 * `DatePickerInputProps`. The current implementation exposes only the subset
 * actually consumed in the monorepo, plus standard a11y props.
 */
export type DatePickerProps = {
  /**
   * Size variant of the trigger input.
   * @default 'medium'
   */
  inputSize?: ItemSize;
  /**
   * Disable the picker. The trigger button is not interactive and the
   * popover cannot be opened.
   */
  disabled?: boolean;
  /**
   * Render the picker as read-only. The trigger displays the current value
   * but the popover cannot be opened.
   */
  readOnly?: boolean;
  /**
   * Callback fired when the selected value changes.
   *
   * - `default` -> the selected `Date` or `null` when cleared
   * - `range`   -> `[from, to]` once both dates are selected, otherwise `null`
   * - `multiple`-> the array of selected `Date`s (empty array allowed)
   */
  onChange?: (value: Date | [Date, Date] | Date[] | null) => void;
  /**
   * The earliest selectable date (inclusive).
   */
  minDate?: Date;
  /**
   * The latest selectable date (inclusive).
   */
  maxDate?: Date;
  /**
   * `id` attribute applied to the trigger button.
   */
  id?: string;
  /**
   * Class name applied to the trigger button.
   */
  className?: string;
  /**
   * Accessible name for the trigger button.
   */
  'aria-label'?: string;
  /**
   * `aria-labelledby` for the trigger button.
   */
  'aria-labelledby'?: string;

  /**
   * Format string used to render the selected date(s) in the trigger.
   *
   * **Note:** This implementation uses `date-fns` format tokens (e.g.
   * `dd/MM/yyyy`). The legacy default value `DD/MM/YYYY` (dayjs tokens) is
   * accepted and converted to the equivalent `date-fns` tokens for backwards
   * compatibility.
   *
   * @default 'DD/MM/YYYY'
   */
  valueFormat?: string;
  /**
   * Placeholder text shown when no date is selected.
   *
   * @default 'dd/mm/yyyy'
   */
  placeholder?: string;
  /**
   * Picker type.
   *
   * - `default` selects a single date
   * - `range` selects a `[from, to]` date range
   * - `multiple` selects an arbitrary array of dates
   *
   * @default 'default'
   */
  type?: DatePickerType;
  /**
   * Initial value when the picker is uncontrolled.
   *
   * - `default` accepts `Date | string`
   * - `range` accepts `[Date, Date]`
   * - `multiple` accepts `Date[]`
   */
  defaultValue?: Date | [Date, Date] | Date[] | string;
  /**
   * Controlled selected value. When set, the picker becomes controlled.
   */
  value?: Date | [Date, Date] | Date[] | string;
  /**
   * Render the trigger in an error state.
   *
   * @default false
   */
  error?: boolean;
};
