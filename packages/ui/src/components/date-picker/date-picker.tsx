import { Popover } from '@base-ui/react/popover';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { type DateRange, DayPicker, type Matcher } from 'react-day-picker';

import styles from './date-picker.module.css';
// variables.css also pulls react-day-picker's stylesheet into `ui.base`.
import './variables.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import inputSizeStyles from '@ui/shared/styles/input-size.module.css';
import listBoxStyles from '@ui/shared/styles/list-box.module.css';

import { dayjsTokenToDateFns, isDateTuple, normalizeInitialValue } from './date-utils';
import type { DatePickerProps, DatePickerType } from './types';

/**
 * Component for selecting a date with customizable format and placeholder.
 *
 * Built on top of `react-day-picker` (calendar) composed with Base UI
 * `Popover` (positioning + dismiss + a11y). The input/trigger uses our
 * standard input-size and input-font-size design tokens.
 */
export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
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
  // The public value type can't represent a partial range, hence a separate draft.
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

  // react-day-picker does not derive the visible month from `selected`.
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
          // `required` disables react-day-picker's click-to-deselect.
          required
          selected={currentValue instanceof Date ? currentValue : undefined}
          onSelect={(selected) => {
            handleChange(selected ?? null);
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
          // min={1} makes the first click report a partial range instead of a same-day one.
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
          // Never narrow with isDateTuple here - a 2-element Date[] matches it and wipes the selection.
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
        <Popover.Positioner className={listBoxStyles['popup']} align="start">
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
