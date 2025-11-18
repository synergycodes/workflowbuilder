import { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@synergycodes/overflow-ui';
import { Icon } from '@workflow-builder/icons';
import { DynamicCondition } from '@/features/json-form/types/controls';
import { validateCondition } from '@/features/json-form/utils/conditional-transform';
import { ConditionsFormField } from '../dynamic-conditions-form-field/conditions-form-field';

import styles from './conditions-form.module.css';
import { closeModal } from '@/features/modals/stores/use-modal-store';

type ConditionsFormProps = {
  onChange: (value: DynamicCondition[]) => void;
  value: DynamicCondition[];
};

const emptyCondition: DynamicCondition = {
  x: '',
  comparisonOperator: 'isEqual',
  y: '',
  logicalOperator: 'AND',
};

export interface ConditionsFormHandle {
  handleConfirm: () => void;
}

export const ConditionsForm = forwardRef<ConditionsFormHandle, ConditionsFormProps>(
  ({ onChange, value }: ConditionsFormProps, ref: ForwardedRef<ConditionsFormHandle>) => {
    const [shouldShowValidation, setShouldShowValidation] = useState(false);
    const [conditions, setConditions] = useState<Partial<DynamicCondition>[]>(
      value.length > 0 ? value : [emptyCondition],
    );

    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
      setShouldShowValidation(false);
    }, [conditions]);

    function addCondition() {
      setConditions((state) => [...state, emptyCondition]);
    }

    function removeCondition(index: number) {
      setConditions((state) => state.filter((_, indexToCheck) => indexToCheck !== index));
    }

    function updateCondition(index: number) {
      return (condition: DynamicCondition) => {
        setConditions((state) => [...state.slice(0, index), condition, ...state.slice(index + 1)]);
      };
    }

    const handleConfirm = useCallback(() => {
      const hasAllVariablesEmpty = conditions.every(({ x, y }) => !x && !y);
      if (hasAllVariablesEmpty) {
        // Everything is empty, so it resets the value
        onChange([]);
        closeModal();
        return;
      }

      const hasErrors = conditions.some((condition) => Object.values(validateCondition(condition)).some(Boolean));
      if (hasErrors) {
        setShouldShowValidation(true);
        return;
      }

      onChange(conditions as DynamicCondition[]);
      closeModal();
    }, [conditions, onChange]);

    const lastIndex = conditions.length - 1;

    useImperativeHandle(ref, () => {
      return { handleConfirm };
    }, [handleConfirm]);

    return (
      <form ref={formRef} className={styles['form']} onSubmit={handleConfirm}>
        <div key={lastIndex} className={styles['controls-container']}>
          {conditions.map((condition, index) => (
            <ConditionsFormField
              key={index}
              condition={condition}
              onChange={updateCondition(index)}
              onRemove={() => removeCondition(index)}
              isLast={index === lastIndex}
              shouldShowValidation={shouldShowValidation}
            />
          ))}
        </div>
        <Button className={styles['add-button']} size="small" variant="secondary" onClick={addCondition}>
          <Icon name="PlusCircle" />
        </Button>
      </form>
    );
  },
);
