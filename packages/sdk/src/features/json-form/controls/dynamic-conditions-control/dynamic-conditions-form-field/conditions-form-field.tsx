import { NavButton, SegmentPicker, Select } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './conditions-form-field.module.css';

import { type ConditionErrors, getConditionErrors } from '../../../../../features/variables/actions/conditions';
import { getStringType } from '../../../../../features/variables/actions/get-string-type';
import { DynamicTypedVariableOrInput } from '../../../../../features/variables/components/dynamic-typed-variable-or-input/dynamic-typed-variable-or-input';
import { VariableText } from '../../../../../features/variables/components/variable-text/variable-text';
import type { VariableSuggestionGroup } from '../../../../../features/variables/components/variable-text/variable-text.types';
import {
  type ComparisonOperator,
  comparisonOperatorsByPrimitiveType,
} from '../../../../../features/variables/constants';
import type { VariableTypePrimitive } from '../../../../../node/node-output-schema';
import type { DynamicCondition } from '../../../../../types/controls';

type ConditionsFormFieldProps = {
  condition: Partial<DynamicCondition>;
  onRemove: () => void;
  onChange: (condition: DynamicCondition) => void;
  shouldShowOperator?: boolean;
  shouldShowValidation?: boolean;
  suggestionGroups: VariableSuggestionGroup[];
};

const getTypeOptions = (
  value?: string,
): {
  xType: VariableTypePrimitive;
  comparisonsOperators: ComparisonOperator[];
} => {
  const xType = getStringType(value);
  const comparisonsOperators: ComparisonOperator[] = comparisonOperatorsByPrimitiveType[xType] || [];

  return {
    xType,
    comparisonsOperators,
  };
};

export function ConditionsFormField(props: ConditionsFormFieldProps) {
  const { condition, onChange, onRemove, shouldShowOperator = false, shouldShowValidation, suggestionGroups } = props;
  const [{ xType, comparisonsOperators }, setTypeOptions] = useState(getTypeOptions(condition.x));

  const { t } = useTranslation();

  function handleChange(field: keyof DynamicCondition, value: unknown) {
    const didTypeChange = field === 'x' && xType !== getTypeOptions(value as string).xType;

    onChange({
      ...condition,
      [field]: value,
      ...(didTypeChange ? { comparisonOperator: 'isEqual', y: '' } : undefined),
    } as DynamicCondition);

    if (didTypeChange) {
      setTypeOptions(getTypeOptions(value as string));
    }
  }

  const errors = useMemo((): Partial<ConditionErrors> => {
    if (!shouldShowValidation) {
      return {};
    }

    return getConditionErrors(condition);
  }, [condition, shouldShowValidation]);

  return (
    <>
      {shouldShowOperator && (
        <div className={styles['segment-picker-container']}>
          <SegmentPicker
            className={styles['segment-picker']}
            size="xx-small"
            value={condition.logicalOperator || 'AND'}
            onChange={(_, value) => handleChange('logicalOperator', value)}
          >
            <SegmentPicker.Item value="AND">{t('conditions.compare.all')}</SegmentPicker.Item>
            <SegmentPicker.Item value="OR">{t('conditions.compare.one')}</SegmentPicker.Item>
          </SegmentPicker>
        </div>
      )}
      <div
        className={clsx(styles['container'], {
          [styles['container-error']]: shouldShowValidation && (!condition.x || !condition.y),
        })}
      >
        <NavButton onClick={() => {}} tooltip={t('tooltips.menu')}>
          <Icon name="DotsSixVertical" />
        </NavButton>
        <div className={styles['inputs-container']}>
          <VariableText
            className={styles['input']}
            value={condition.x || ''}
            onChange={(value) => handleChange('x', value)}
            variant="text"
            suggestionGroups={suggestionGroups}
            hasError={shouldShowValidation && errors.x}
            mentionsInputProps={{ placeholder: t('variables.placeholderForStringOrVariable') }}
            mentionProps={{ appendSpaceOnAdd: false }}
          />
          <Select
            className={styles['input']}
            value={condition.comparisonOperator}
            items={comparisonsOperators.map((operator) => ({
              label: t(`conditions.compare.${operator}`) as string,
              value: operator,
            }))}
            onChange={(_, value) => handleChange('comparisonOperator', value)}
            error={shouldShowValidation && errors.comparisonOperator}
          />
          <DynamicTypedVariableOrInput
            className={styles['input']}
            onChange={(value) => handleChange('y', value)}
            value={condition.y}
            isError={shouldShowValidation && errors.y}
            type={xType}
            suggestionGroups={suggestionGroups}
          />
        </div>
        <NavButton onClick={onRemove} tooltip={t('tooltips.menu')}>
          <Icon name="X" />
        </NavButton>
      </div>
    </>
  );
}
