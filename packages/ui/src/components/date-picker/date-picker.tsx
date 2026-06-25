import { Popover } from '@base-ui/react/popover';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { type DateRange, DayPicker, type Matcher } from 'react-day-picker';

import { dayjsTokenToDateFns, isDateTuple, normalizeInitialValue } from './date-utils';
import styles from './date-picker.module.css';
import './variables.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import inputSizeStyles from '@ui/shared/styles/input-size.module.css';

import type { DatePickerProps, DatePickerType } from './types';

type Props = DatePickerProps & {
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

/**
 * Component for selecting a date with customizable format and placeholder.
 *
 * Built on top of `react-day-picker` (calendar) composed with Base UI
 * `Popover` (positioning + dismiss + a11y). The input/trigger uses our
 * standard input-size and input-font-size design tokens.
 */
export const DatePicker = forwardRef<HTMLButtonElement, Props>(function DatePicker(
  {
    inputSize = 'medium',
    valueFormat = 'DD/MM/YYYY',
    placeholder = 'dd/mm/yyyy',
    type = 'default',
    value,
    defaultValue,
    error = false,
    disabled,
    readOnly,
    onChange,
    minDate,
    maxDate,
    id,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
  },
  ref,
) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<Date | [Date, Date] | Date[] | null>(() =>
    normalizeInitialValue(defaultValue, type),
  );
  const [open, setOpen] = useState(false);
  // In-progress range pick ({ from, to: undefined }). The public value
  // type can't represent a partial range, so the draft renders the
  // first-click highlight until the range completes.
  const [rangeDraft, setRangeDraft] = useState<DateRange | undefined>();

  const currentValue = isControlled ? normalizeInitialValue(value, type) : internalValue;

  const formatToken = useMemo(() => dayjsTokenToDateFns(valueFormat), [valueFormat]);

  const triggerLabel = useMemo(
    () => formatTriggerLabel(currentValue, type, formatToken),
    [currentValue, type, formatToken],
  );

  const handleChange = useCallback(
    (next: Date | [Date, Date] | Date[] | null) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  // Open the calendar at the month of the current selection (react-day-picker
  // does not derive this from `selected` — without it the calendar always
  // opens on today's month).
  const defaultMonth = useMemo(() => {
    if (currentValue instanceof Date) return currentValue;
    if (Array.isArray(currentValue) && currentValue[0] instanceof Date) {
      return currentValue[0];
    }
    return;
  }, [currentValue]);

  const disabledMatcher = useMemo<Matcher[] | undefined>(() => {
    const matchers: Matcher[] = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length === 0 ? undefined : matchers;
  }, [minDate, maxDate]);

  const triggerClassName = clsx(
    inputFontStyles[inputSize],
    inputSizeStyles[inputSize],
    styles['container'],
    {
      [styles['container--error']]: error,
      [styles['container--placeholder']]: triggerLabel === null,
    },
    className,
  );

  const calendar = (
    <>
      {type === 'default' && (
        <DayPicker
          mode="single"
          // `required` disables react-day-picker's click-to-deselect, so
          // re-clicking the selected day confirms instead of wiping the
          // value (Mantine parity: allowDeselect was off).
          required
          selected={currentValue instanceof Date ? currentValue : undefined}
          onSelect={(selected) => {
            handleChange(selected ?? null);
            // A single-date pick is a complete selection — close the
            // popover. Range/multiple modes stay open for further picks.
            setOpen(false);
          }}
          disabled={disabledMatcher}
          defaultMonth={defaultMonth}
          startMonth={minDate}
          endMonth={maxDate}
          showOutsideDays
          weekStartsOn={1}
          navLayout="around"
          components={{ Chevron: CalendarChevron }}
        />
      )}
      {type === 'range' && (
        <DayPicker
          mode="range"
          // min={1} makes the first click report { from, to: undefined }
          // instead of a same-day "complete" range, and rejects single-day
          // ranges (Mantine parity: allowSingleDateInRange was off).
          min={1}
          selected={rangeDraft ?? toDateRange(currentValue)}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              setRangeDraft(undefined);
              handleChange([range.from, range.to]);
              setOpen(false);
            } else {
              setRangeDraft(range);
              if (currentValue !== null) {
                handleChange(null);
              }
            }
          }}
          disabled={disabledMatcher}
          defaultMonth={defaultMonth}
          startMonth={minDate}
          endMonth={maxDate}
          showOutsideDays
          weekStartsOn={1}
          navLayout="around"
          components={{ Chevron: CalendarChevron }}
        />
      )}
      {type === 'multiple' && (
        <DayPicker
          mode="multiple"
          // In multiple mode the value is always Date[] | null (see
          // normalizeInitialValue/handleChange) — never test the shape
          // with isDateTuple here: a 2-element Date[] would match it and
          // wipe the selection.
          selected={Array.isArray(currentValue) ? currentValue : undefined}
          onSelect={(dates) => handleChange(dates ?? [])}
          disabled={disabledMatcher}
          defaultMonth={defaultMonth}
          startMonth={minDate}
          endMonth={maxDate}
          showOutsideDays
          weekStartsOn={1}
          navLayout="around"
          components={{ Chevron: CalendarChevron }}
        />
      )}
    </>
  );

  return (
    <Popover.Root
      open={disabled || readOnly ? false : open}
      onOpenChange={(nextOpen) => {
        if (disabled || readOnly) return;
        setOpen(nextOpen);
        if (!nextOpen) {
          // Closing mid-pick abandons the partial range.
          setRangeDraft(undefined);
        }
      }}
    >
      <Popover.Trigger
        ref={ref}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-readonly={readOnly || undefined}
        className={triggerClassName}
      >
        <span className={styles['trigger-label']}>{triggerLabel ?? placeholder}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start">
          <Popover.Popup className={styles['calendar']}>{calendar}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
});

function CalendarChevron({
  orientation,
  className,
}: {
  orientation?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}) {
  if (orientation === 'left') {
    return <CaretLeft className={className} weight="bold" />;
  }
  if (orientation === 'right') {
    return <CaretRight className={className} weight="bold" />;
  }
  // up/down used by dropdowns — fall back to a right-pointing caret rotated
  return <CaretRight className={className} weight="bold" />;
}

function formatTriggerLabel(
  value: Date | [Date, Date] | Date[] | null,
  type: DatePickerType,
  token: string,
): string | null {
  if (value == null) return null;
  if (type === 'default') {
    return value instanceof Date ? format(value, token) : null;
  }
  if (type === 'range') {
    if (!isDateTuple(value)) return null;
    const [from, to] = value;
    return `${format(from, token)} – ${format(to, token)}`;
  }
  if (type === 'multiple') {
    if (!Array.isArray(value) || value.length === 0) return null;
    return value.map((d) => format(d, token)).join(', ');
  }
  return null;
}

function toDateRange(value: Date | [Date, Date] | Date[] | null): DateRange | undefined {
  if (!isDateTuple(value)) return undefined;
  return { from: value[0], to: value[1] };
}
