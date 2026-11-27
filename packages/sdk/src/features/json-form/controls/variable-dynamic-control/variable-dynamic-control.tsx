import { useCallback, useEffect, useState } from 'react';

import type { WBControlProps } from '../../../../types/controls';
import { getIsStringNumber } from '../../../../utils/validation/get-is-string-number';
import { useSingleSelectedElement } from '../../../properties-bar/use-single-selected-element';
import { DynamicTypedVariableOrInput } from '../../../variables/components/dynamic-typed-variable-or-input/dynamic-typed-variable-or-input';
import { COMPATIBLE_VARIABLE_TYPES_BY_PRIMITIVE, VARIABLES_TYPES_EMPTY } from '../../../variables/constants';
import { useNodeVariables } from '../../../variables/hooks/use-node-variables';
import { getBooleanIfPossible } from '../../../variables/utils/get-boolean-if-possible';
import { getIsStringVariableReference } from '../../../variables/utils/keys/get-is-string-variable-reference';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';
import type { VariableDynamicControlElement } from './type';

type VariableDynamicControlProps = WBControlProps<string, VariableDynamicControlElement>;

function VariableDynamicControl(props: VariableDynamicControlProps) {
  const { data, handleChange, path, errors, enabled, uischema } = props;
  const { placeholder, disabled, variableType } = uischema;
  const isDisabled = !enabled || disabled === true;
  const compatibleTypes = COMPATIBLE_VARIABLE_TYPES_BY_PRIMITIVE[variableType];

  const selection = useSingleSelectedElement();
  const { suggestionGroups, variablesKey } = useNodeVariables(selection?.node?.id, {
    excludeTypes: VARIABLES_TYPES_EMPTY,
    includeTypes: compatibleTypes,
  });

  const [inputValue, setInputValue] = useState<string>(data == null ? '' : String(data));

  useEffect(() => {
    setInputValue((current) => {
      if (data != null) {
        return String(data);
      }

      // Text that did not parse stays in the field with its error state, so the user sees why nothing was saved.
      return variableType === 'number' && (current ?? '').trim() !== '' ? current : '';
    });
  }, [data, variableType]);

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
        key={variablesKey}
        type={variableType}
        value={inputValue}
        onChange={onChange}
        onBlur={onBlur}
        suggestionGroupsForType={suggestionGroups}
        isError={errors.length > 0}
        isDisabled={isDisabled}
        placeholder={placeholder}
      />
    </ControlWrapper>
  );
}

export const variableDynamicControlRenderer = createControlRenderer('VariableDynamic', VariableDynamicControl);
