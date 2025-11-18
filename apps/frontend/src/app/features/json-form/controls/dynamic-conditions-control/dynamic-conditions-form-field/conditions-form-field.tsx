import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Input, Select, NavButton, SegmentPicker } from '@synergycodes/overflow-ui';
import { useMemo } from 'react';
import { Icon } from '@workflow-builder/icons';
import styles from './conditions-form-field.module.css';
import { comparisonsOperators, validateCondition } from '@/features/json-form/utils/conditional-transform';
import { DynamicCondition } from '@/features/json-form/types/controls';

type ConditionsFormFieldProps = {
  condition: Partial<DynamicCondition>;
  onRemove: () => void;
  onChange: (condition: DynamicCondition) => void;
  isLast?: boolean;
  shouldShowValidation?: boolean;
};

export function ConditionsFormField(props: ConditionsFormFieldProps) {
  const { condition, onChange, onRemove, isLast, shouldShowValidation } = props;

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
      {!isLast && (
        <div className={styles['segment-picker-container']}>
          <SegmentPicker
            className={styles['segment-picker']}
            size="xx-small"
            value={condition.logicalOperator || 'AND'}
            onChange={(_, value) => handleChange('logicalOperator', value)}
          >
            <SegmentPicker.Item value="AND">{t('conditions.compare.and')}</SegmentPicker.Item>
            <SegmentPicker.Item value="OR">{t('conditions.compare.or')}</SegmentPicker.Item>
          </SegmentPicker>
        </div>
      )}
    </>
  );
}
