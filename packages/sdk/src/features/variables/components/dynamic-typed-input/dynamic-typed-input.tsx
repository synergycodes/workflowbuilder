import { DatePicker, Input, Select } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './dynamic-typed-input.module.css';

import type { VariableTypePrimitive } from '../../../../node/node-output-schema';
import { getDateIfValid, getTimeFromDateIfValid, setDateWithTimeFromTime } from '../../../../utils/time';
import { getIsStringNumber } from '../../../../utils/validation/get-is-string-number';
import { getIsValidDate, getIsValidTime } from '../../../../utils/validation/get-is-valid-date';
import { VARIABLE_BRACKETS_START, variableTypeInfoByType } from '../../constants';
import { filterSuggestionGroupsByType } from '../../utils/filter-suggestion-groups-by-type';
import { getIsDateType } from '../../utils/get-is-date-type';
import { VariableText } from '../variable-text/variable-text';
import type { VariableSuggestionGroup } from '../variable-text/variable-text.types';
import { itemsForBoolean, typesForInput } from './constants';

type DynamicTypedInputProps = {
  className?: string;
  onChange: (value: string) => void;
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

  if (typesForInput.includes(variableTypeInfo.type)) {
    const { baseType } = variableTypeInfo;
    const isInvalidNumberValue =
      baseType === 'number' &&
      !!value &&
      !getIsStringNumber(value) &&
      !value.startsWith(VARIABLE_BRACKETS_START.slice(0, 1));

    if (suggestionGroupsForString.length > 0) {
      return (
        <VariableText
          className={className}
          value={String(value) || ''}
          onChange={onChange}
          hasError={isError || isInvalidNumberValue}
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
        error={isError || isInvalidNumberValue}
        placeholder={
          placeholder ??
          t(baseType === 'number' ? 'variables.placeholderTypeNumber' : 'variables.placeholderTypeString')
        }
        disabled={disabled}
      />
    );
  }

  if (type === 'boolean') {
    return (
      <div className={styles['container--select']}>
        <Select
          className={className}
          value={value}
          items={itemsForBoolean}
          onChange={(_event, value) => onChange(value as string)}
          placeholder={placeholder}
          disabled={disabled}
          error={isError}
        />
        {endAdornment && <span className={styles['adornment--select']}>{endAdornment}</span>}
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className={styles['date-with-reset-container']}>
        <DatePicker
          key={value}
          className={clsx(styles['date-picker'], className)}
          value={getDateIfValid(value)}
          onChange={(value) => {
            const date = setDateWithTimeFromTime(value as Date, timeForRawDates);

            onChange(date.toISOString());
          }}
          valueFormat={'dd-MM-yyyy'}
          placeholder={placeholder || 'DD-MM-YYYY'}
          error={isError}
          disabled={disabled}
        />
        {endAdornment && <span className={styles['adornment--date']}>{endAdornment}</span>}
      </div>
    );
  }

  if (type === 'datetime') {
    const date = getDateIfValid(value);

    return (
      <div className={styles['row']}>
        <DatePicker
          key={value}
          className={clsx(styles['date-picker'], className)}
          value={date}
          onChange={(value) => {
            const date = setDateWithTimeFromTime(value as Date, timeForRawDates);
            onChange(date.toISOString());
            setTime(getTimeFromDateIfValid(date.toISOString()));
          }}
          valueFormat="dd-MM-yyyy"
          placeholder="DD-MM-YYYY"
          // Uncomment to see times in value
          // valueFormat="DD-MM-YYYY HH:mm"
          // placeholder="DD-MM-YYYY HH:mm"
          disabled={disabled}
          error={isError}
        />
        <Input
          className={className}
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
                  onChange(setDateWithTimeFromTime(date, value)?.toISOString());
                }
              } else {
                setTime(timeForRawDates);

                if (date && getIsValidDate(date)) {
                  onChange(setDateWithTimeFromTime(date, timeForRawDates)?.toISOString());
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
