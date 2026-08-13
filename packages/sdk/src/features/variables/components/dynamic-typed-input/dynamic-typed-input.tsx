import { DatePicker, Input, Select } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './dynamic-typed-input.module.css';

import type { VariableTypePrimitive } from '../../../../node/node-output-schema';
import { getDateIfValid, getISODate, getTimeFromDateIfValid, setDateWithTimeFromTime } from '../../../../utils/time';
import { getIsStringNumber } from '../../../../utils/validation/get-is-string-number';
import { getIsValidDate, getIsValidTime } from '../../../../utils/validation/get-is-valid-date';
import { variableTypeInfoByType } from '../../constants';
import { filterSuggestionGroupsByType } from '../../utils/filter-suggestion-groups-by-type';
import { getBooleanStringIfPossible } from '../../utils/get-boolean-if-possible';
import { getIsDateType } from '../../utils/get-is-date-type';
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
  const [time, setTime] = useState(getIsDateType(type) ? getTimeFromDateIfValid(value) : undefined);
  const variableTypeInfo = type ? variableTypeInfoByType[type] : undefined;
  const { t } = useTranslation();

  useEffect(() => {
    if (getIsDateType(type)) {
      setTime(getTimeFromDateIfValid(value));
    }
  }, [type, value]);

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
        // Adornment here doesn't make sense since we show variable picker above
        // endAdornment={endAdornment}
        onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
        error={isError}
        placeholder={placeholder ?? t('variables.placeholderTypeString')}
        disabled={disabled}
      />
    );
  }

  if (variableTypeInfo.type === 'number') {
    const isValidRegularNumber = getIsStringNumber(value);
    const isValidVariableNumber = getIsStringVariableReferenceStart(value);
    const isInvalidNumberValue = !(isValidRegularNumber || isValidVariableNumber);

    return (
      <Input
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value as string)}
        endAdornment={endAdornment}
        onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
        error={isError || isInvalidNumberValue}
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
          className={clsx(styles['select'], className)}
          value={booleanValue}
          items={itemsForBoolean}
          onChange={(_event, value) => {
            onChange(value as string);

            // It's the most reliable method to call
            if (onBlur) {
              onBlur(value as string);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          error={isError}
        />
        {endAdornment && <span className={clsx(styles['adornment--select'], 'right-adornment')}>{endAdornment}</span>}
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className={styles['date-with-reset-container']}>
        <DatePicker
          key={value}
          className={clsx(
            styles['date-picker'],
            styles['date-picker--date'],
            styles['date-picker--date-alone'],
            className,
          )}
          value={getDateIfValid(value)}
          onChange={(value) => {
            const date = setDateWithTimeFromTime(value as Date, timeForRawDates);

            const newValue = getISODate(date);
            onChange(newValue);

            // It's the most reliable method to call
            if (onBlur) {
              onBlur(newValue);
            }
          }}
          valueFormat={'DD-MM-YYYY'}
          placeholder={placeholder || 'DD-MM-YYYY'}
          error={isError}
          disabled={disabled}
        />
        {endAdornment && <span className={clsx(styles['adornment--date'], 'right-adornment')}>{endAdornment}</span>}
      </div>
    );
  }

  if (type === 'datetime') {
    const date = getDateIfValid(value);

    return (
      <div className={styles['row']}>
        <DatePicker
          key={value}
          className={clsx(styles['date-picker'], styles['date-picker--date'], className)}
          value={date}
          onChange={(value) => {
            const date = setDateWithTimeFromTime(value as Date, timeForRawDates);

            const newValue = getISODate(date);

            onChange(newValue);
            // setTime(getTimeFromDateIfValid(newValue));

            // It's the most reliable method to call
            if (onBlur) {
              onBlur(newValue);
            }
          }}
          valueFormat="DD-MM-YYYY"
          placeholder="DD-MM-YYYY"
          // Uncomment to see times in value
          // valueFormat="DD-MM-YYYY HH:mm"
          // placeholder="DD-MM-YYYY HH:mm"
          disabled={disabled}
          error={isError}
        />
        <Input
          className={clsx(styles['date-picker'], styles['date-picker--time'], className)}
          value={time}
          placeholder="HH:mm"
          onChange={(event) => {
            const value = (event.target.value as string).slice(0, 5);
            if (value.length < 5) {
              setTime(value);

              return;
            }

            if (value.length === 5) {
              if (getIsValidTime(value)) {
                setTime(value);

                if (date && getIsValidDate(date)) {
                  onChange(getISODate(setDateWithTimeFromTime(date, value)));
                }
              } else {
                setTime(timeForRawDates);

                if (date && getIsValidDate(date)) {
                  onChange(getISODate(setDateWithTimeFromTime(date, timeForRawDates)));
                }
              }
            }
          }}
          onBlur={(event) => {
            if (!onBlur) {
              return;
            }

            const value = (event.target.value as string).slice(0, 5);
            if (value.length === 5) {
              if (getIsValidTime(value)) {
                setTime(value);

                if (date && getIsValidDate(date)) {
                  onBlur(getISODate(setDateWithTimeFromTime(date, value)));
                }
              } else {
                setTime(timeForRawDates);

                if (date && getIsValidDate(date)) {
                  onBlur(getISODate(setDateWithTimeFromTime(date, timeForRawDates)));
                }
              }
            }
          }}
          disabled={disabled || !date}
          error={isError}
          endAdornment={endAdornment}
        />
      </div>
    );
  }

  return null;
}
