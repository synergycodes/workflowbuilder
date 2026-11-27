import plusCircleIcon from '@iconify-icons/ph/plus-circle';
import { Button } from '@workflowbuilder/ui';
import { type ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './conditions-form.module.css';

import type { DynamicCondition } from '../../../../../features/json-form/types/controls';
import { closeModal } from '../../../../../features/modals/stores/use-modal-store';
import { useSingleSelectedElement } from '../../../../../features/properties-bar/use-single-selected-element';
import { VARIABLES_TYPES_NOT_PRIMITIVE } from '../../../../../features/variables/constants';
import { Icon } from '../../../../../icon/icon';
import { useStore } from '../../../../../store/store';
import { useNodeVariables } from '../../../../variables/hooks/use-node-variables';
import { getConditionErrors } from '../../../../variables/utils/form-validation/conditions';
import { ConditionsFormField } from '../dynamic-conditions-form-field/conditions-form-field';

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
    const { t } = useTranslation();
    const [shouldShowValidation, setShouldShowValidation] = useState(false);
    const [conditions, setConditions] = useState<Partial<DynamicCondition>[]>(
      value.length > 0 ? value : [emptyCondition],
    );

    const selection = useSingleSelectedElement();
    const isReadOnly = useStore((store) => store.isReadOnly);
    const { suggestionGroups, variablesKey } = useNodeVariables(selection?.node?.id, {
      excludeTypes: VARIABLES_TYPES_NOT_PRIMITIVE,
    });

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
      // The modal opens in read-only mode for inspection; nothing in it may reach the diagram then.
      if (isReadOnly) {
        closeModal();
        return;
      }

      const hasAllVariablesEmpty = conditions.every(({ x, y }) => !x && !y);
      if (hasAllVariablesEmpty) {
        // Everything is empty, so it resets the value
        onChange([]);
        closeModal();
        return;
      }

      const hasErrors = conditions.some((condition) => Object.values(getConditionErrors(condition)).some(Boolean));
      if (hasErrors) {
        setShouldShowValidation(true);
        return;
      }

      onChange(conditions as DynamicCondition[]);
      closeModal();
    }, [conditions, isReadOnly, onChange]);

    const lastIndex = conditions.length - 1;

    useImperativeHandle(ref, () => {
      return { handleConfirm };
    }, [handleConfirm]);

    return (
      <form ref={formRef} className={styles['form']} onSubmit={handleConfirm}>
        <div key={`${lastIndex}-${variablesKey}`} className={styles['controls-container']}>
          {conditions.map((condition, index) => (
            <ConditionsFormField
              key={index}
              condition={condition}
              onChange={updateCondition(index)}
              onRemove={() => removeCondition(index)}
              shouldShowOperator={index === 0 && lastIndex !== 0}
              shouldShowValidation={shouldShowValidation}
              suggestionGroups={suggestionGroups}
            />
          ))}
        </div>
        <Button
          className={styles['add-button']}
          size="s"
          variant="ghost-secondary"
          shape="square"
          prefixIcon={<Icon icon={plusCircleIcon} />}
          aria-label={t('conditions.add')}
          onClick={addCondition}
          disabled={isReadOnly}
        />
      </form>
    );
  },
);
