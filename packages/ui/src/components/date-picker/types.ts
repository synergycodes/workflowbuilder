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
};
