import { Input, NavButton, SegmentPicker, Select } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './conditions-form-field.module.css';

import { DynamicCondition } from '@/features/json-form/types/controls';
import { comparisonsOperators, validateCondition } from '@/features/json-form/utils/conditional-transform';

type ConditionsFormFieldProps = {
  condition: Partial<DynamicCondition>;
  onRemove: () => void;
  onChange: (condition: DynamicCondition) => void;
  shouldShowOperator?: boolean;
  shouldShowValidation?: boolean;
};

export function ConditionsFormField(props: ConditionsFormFieldProps) {
  const { condition, onChange, onRemove, shouldShowOperator = false, shouldShowValidation } = props;

  const { t } = useTranslation();

  function handleChange(field: 'x' | 'comparisonOperator' | 'y' | 'logicalOperator', value: unknown) {
    onChange({
      ...condition,
      [field]: value,
    } as DynamicCondition);
  }

  const errors = useMemo((): {
    x?: boolean;
    comparisonOperator?: boolean;
    y?: boolean;
  } => {
    if (!shouldShowValidation) {
      return {};
    }

    return validateCondition(condition);
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
          <Input
            className={styles['input']}
            onChange={(event) => handleChange('x', event.target.value)}
            value={condition.x}
            error={errors.x}
          />
          <Select
            className={styles['input']}
            value={condition.comparisonOperator}
            items={comparisonsOperators.map((operator) => ({
              label: t(`conditions.compare.${operator}`) as string,
              value: operator,
            }))}
            onChange={(_, value) => handleChange('comparisonOperator', value)}
            error={errors.comparisonOperator}
          />
          <Input
            className={styles['input']}
            onChange={(event) => handleChange('y', event.target.value)}
            value={condition.y}
            error={errors.y}
          />
        </div>
        <NavButton onClick={onRemove} tooltip={t('tooltips.menu')}>
          <Icon name="X" />
        </NavButton>
      </div>
    </>
  );
}
