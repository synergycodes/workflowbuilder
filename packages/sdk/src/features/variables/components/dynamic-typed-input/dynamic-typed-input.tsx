import { DatePicker, Input, Select } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { VariableTypePrimitive } from '@workflow-builder/types/variables/variables';

import styles from './dynamic-typed-input.module.css';

import {
  getDateIfValid,
  getDateTimeISO,
  getDateYYYYMMDD,
  getTimeHHmm,
  getTimeHHmmISO,
} from '../../../../utils/time-iso';
import { getIsStringNumber } from '../../../../utils/validation/get-is-string-number';
import { variableTypeInfoByType } from '../../constants';
import { filterSuggestionGroupsByType } from '../../utils/filter-suggestion-groups-by-type';
import { getBooleanStringIfPossible } from '../../utils/get-boolean-if-possible';
import { getIsStringVariableReferenceStart } from '../../utils/keys/get-is-string-variable-reference';
import { VariableText } from '../variable-text/variable-text';
import type { VariableSuggestionGroup } from '../variable-text/variable-text.types';
import { itemsForBoolean, typesForInput } from './constants';

type DynamicTypedInputProps = {
  className?: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  value?: string;
  type?: VariableTypePrimitive;
  placeholder?: string;
  isError?: boolean;
  disabled?: boolean;
  timeForRawDates?: '00:00' | '23:59';
  endAdornment?: React.ReactNode;
  suggestionGroups: VariableSuggestionGroup[];
};

const TIME_LENGTH = 'HH:mm'.length;

/** The `HH:mm` typed into an uncontrolled time input, or undefined while it is still being typed. */
const getTypedTime = (input: HTMLInputElement): string | undefined => {
  const rawTime = input.value.slice(0, TIME_LENGTH);

  return rawTime.length < TIME_LENGTH ? undefined : rawTime;
};

export function DynamicTypedInput({
  className,
  onChange,
  onBlur,
  value,
  type,
  placeholder,
  isError = false,
  disabled = false,
  timeForRawDates = '00:00',
  endAdornment,
  suggestionGroups = [],
}: DynamicTypedInputProps) {
  const variableTypeInfo = type ? variableTypeInfoByType[type] : undefined;
  const { t } = useTranslation();

  const suggestionGroupsForString = useMemo(() => {
    if (!variableTypeInfo || typesForInput.includes(variableTypeInfo.type) === false) {
      return [];
    }

    if (!type) {
      return [];
    }

    return filterSuggestionGroupsByType(suggestionGroups, [type]);
  }, [suggestionGroups, type, variableTypeInfo]);

  if (!variableTypeInfo) {
    return null;
  }

  if (variableTypeInfo.type === 'string') {
    if (suggestionGroupsForString.length > 0) {
      return (
        <VariableText
          className={className}
          value={String(value) || ''}
          onChange={onChange}
          onBlur={onBlur}
          hasError={isError}
          mentionsInputProps={{ placeholder: t('variables.placeholderForStringOrVariable'), disabled }}
          mentionProps={{ appendSpaceOnAdd: false }}
          suggestionGroups={suggestionGroupsForString}
        />
      );
    }

    return (
      <Input
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value as string)}
        onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
        state={isError ? 'critical' : 'default'}
        placeholder={placeholder ?? t('variables.placeholderTypeString')}
        disabled={disabled}
      />
    );
  }

  if (variableTypeInfo.type === 'number') {
    const isValidRegularNumber = getIsStringNumber(value);
    const isValidVariableNumber = getIsStringVariableReferenceStart(value);
    const isInvalidNumberValue = value !== '' && !(isValidRegularNumber || isValidVariableNumber);

    return (
      <Input
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value as string)}
        suffixIcon={endAdornment}
        onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
        state={isError || isInvalidNumberValue ? 'critical' : 'default'}
        placeholder={placeholder ?? t('variables.placeholderTypeNumber')}
        disabled={disabled}
      />
    );
  }

  if (type === 'boolean') {
    const booleanValue = getBooleanStringIfPossible(value);

    return (
      <div className={styles['container--select']}>
        <Select
          error={isError}
          className={clsx(styles['select'], className)}
          value={booleanValue}
          items={itemsForBoolean}
          onChange={(_event, value) => {
            onChange(value as string);

            if (onBlur) {
              onBlur(value as string);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        {endAdornment && <span className={clsx(styles['adornment--select'], 'right-adornment')}>{endAdornment}</span>}
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className={styles['date-with-reset-container']}>
        <DatePicker
          error={isError}
          key={value}
          className={clsx(
            styles['date-picker'],
            styles['date-picker--date'],
            styles['date-picker--date-alone'],
            className,
          )}
          value={getDateIfValid(value)}
          onChange={(pickedDate) => {
            const newValue = getDateYYYYMMDD(pickedDate as Date | null) ?? '';

            onChange(newValue);

            if (onBlur) {
              onBlur(newValue);
            }
          }}
          valueFormat={'dd-MM-yyyy'}
          placeholder={placeholder || 'DD-MM-YYYY'}
          disabled={disabled}
        />
        {endAdornment && <span className={clsx(styles['adornment--date'], 'right-adornment')}>{endAdornment}</span>}
      </div>
    );
  }

  if (type === 'time') {
    // Uncontrolled input: a full `HH:mm` is kept as typed and saved as `HH:mm:00+00:00`, anything else clears.
    const commitTime = (input: HTMLInputElement, emit: (value: string) => void) => {
      const rawTime = getTypedTime(input);

      if (rawTime === undefined) {
        return;
      }

      input.value = getTimeHHmm(rawTime) ?? '';
      emit(getTimeHHmmISO(rawTime) ?? '');
    };

    return (
      <Input
        // Remounts with the committed clock after a full `HH:mm`
        key={`time-${value}`}
        className={clsx(styles['date-picker'], className)}
        defaultValue={getTimeHHmm(value)}
        maxLength={TIME_LENGTH}
        placeholder={placeholder || 'HH:mm'}
        suffixIcon={endAdornment}
        onChange={(event) => commitTime(event.target, onChange)}
        onBlur={onBlur ? (event) => commitTime(event.target, onBlur) : undefined}
        disabled={disabled}
        state={isError ? 'critical' : 'default'}
      />
    );
  }

  if (type === 'datetime') {
    const date = getDateIfValid(value);
    const time = getTimeHHmm(value);

    // Uncontrolled input: a full `HH:mm` is kept as typed, anything else snaps to the raw-date time.
    const commitTime = (input: HTMLInputElement, emit: (value: string) => void) => {
      const rawTime = getTypedTime(input);

      if (rawTime === undefined) {
        return;
      }

      const timeHHmm = getTimeHHmm(rawTime) ?? timeForRawDates;

      input.value = timeHHmm;

      if (date) {
        emit(getDateTimeISO(date, timeHHmm) ?? '');
      }
    };

    return (
      <div className={styles['row']}>
        <DatePicker
          error={isError}
          key={value}
          className={clsx(styles['date-picker'], styles['date-picker--date'], className)}
          value={date}
          onChange={(pickedDate) => {
            const newValue = getDateTimeISO(pickedDate as Date | null, time, timeForRawDates) ?? '';

            onChange(newValue);

            if (onBlur) {
              onBlur(newValue);
            }
          }}
          valueFormat="dd-MM-yyyy"
          placeholder="DD-MM-YYYY"
          disabled={disabled}
        />
        <Input
          // Remounts with the committed clock after a day pick or a full `HH:mm`
          key={`time-${value}`}
          className={clsx(styles['date-picker'], styles['date-picker--time'], className)}
          defaultValue={time}
          maxLength={TIME_LENGTH}
          placeholder="HH:mm"
          suffixIcon={endAdornment}
          onChange={(event) => commitTime(event.target, onChange)}
          onBlur={onBlur ? (event) => commitTime(event.target, onBlur) : undefined}
          disabled={disabled || !date}
          state={isError ? 'critical' : 'default'}
        />
      </div>
    );
  }

  return null;
}
