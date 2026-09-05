import { useCallback, useEffect, useState } from 'react';

import type { VariableType, VariableTypePrimitive } from '../../../../node/node-output-schema';
import type { WBControlProps } from '../../../../types/controls';
import { getIsStringNumber } from '../../../../utils/validation/get-is-string-number';
import { useSingleSelectedElement } from '../../../properties-bar/use-single-selected-element';
import { DynamicTypedVariableOrInput } from '../../../variables/components/dynamic-typed-variable-or-input/dynamic-typed-variable-or-input';
import { useNodeVariables } from '../../../variables/hooks/use-node-variables';
import { getBooleanIfPossible } from '../../../variables/utils/get-boolean-if-possible';
import { getIsStringVariableReference } from '../../../variables/utils/keys/get-is-string-variable-reference';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';
import type { VariableDynamicControlElement } from './type';

type VariableDynamicControlProps = WBControlProps<string, VariableDynamicControlElement>;

const variableTypesForSuggestions: Record<VariableTypePrimitive, VariableType[]> = {
  boolean: ['boolean'],
  date: ['date', 'datetime'],
  datetime: ['date', 'datetime'],
  number: ['number'],
  string: ['string', 'number', 'date', 'datetime'],
};

function VariableDynamicControl(props: VariableDynamicControlProps) {
  const { data, handleChange, path, errors, enabled, uischema } = props;
  const { placeholder, variableType } = uischema;
  const selection = useSingleSelectedElement();
  const { suggestionGroups, totalVariables } = useNodeVariables(selection?.node?.id, {
    excludeTypes: [],
    includeTypes: variableTypesForSuggestions[variableType],
  });

  const [inputValue, setInputValue] = useState<string>(data);

  useEffect(() => {
    if (data == null) {
      setInputValue('');
    } else {
      setInputValue(String(data));
    }
  }, [data]);

  const onChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const onBlur = useCallback(
    (value: string) => {
      setInputValue(value);
      const trimmedValue = value.trim();
      const isSingleVariable = getIsStringVariableReference(trimmedValue);

      if (isSingleVariable) {
        handleChange(path, trimmedValue);

        return;
      }

      if (variableType === 'number') {
        const isNumber = getIsStringNumber(trimmedValue);
        handleChange(path, isNumber ? Number(trimmedValue) : undefined);

        return;
      }

      if (variableType === 'boolean') {
        const valueToSave = getBooleanIfPossible(trimmedValue);

        handleChange(path, valueToSave);

        return;
      }

      handleChange(path, trimmedValue || undefined);
    },
    [handleChange, path, variableType],
  );

  return (
    <ControlWrapper {...props}>
      <DynamicTypedVariableOrInput
        key={totalVariables}
        type={variableType}
        value={inputValue}
        onChange={onChange}
        onBlur={onBlur}
        suggestionGroups={suggestionGroups}
        isError={errors.length > 0}
        isDisabled={!enabled}
        placeholder={placeholder}
      />
    </ControlWrapper>
  );
}

export const variableDynamicControlRenderer = createControlRenderer('VariableDynamic', VariableDynamicControl);
