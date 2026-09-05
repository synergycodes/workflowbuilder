import { useCallback, useEffect, useState } from 'react';

import { useSingleSelectedElement } from '../../../../features/properties-bar/use-single-selected-element';
import { VariableText } from '../../../../features/variables/components/variable-text/variable-text';
import { variablesTypesNumeric, variablesTypesToExcludeInText } from '../../../../features/variables/constants';
import { useNodeVariables } from '../../../variables/hooks/use-node-variables';
import type { VariableTextAreaControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function VariableTextAreaControl(props: VariableTextAreaControlProps) {
  const { data, handleChange, path, errors, enabled, uischema, schema } = props;
  const { placeholder, variablesTypes, disabled } = uischema;
  const { type } = schema;
  const selection = useSingleSelectedElement();
  const { suggestionGroups, totalVariables } = useNodeVariables(selection?.node?.id, {
    excludeTypes: variablesTypes ? [] : variablesTypesToExcludeInText,
    includeTypes: variablesTypes || (type === 'number' ? variablesTypesNumeric : undefined),
  });

  const isDisabled = !enabled || disabled === true;

  const [inputValue, setInputValue] = useState(data ?? '');

  useEffect(() => {
    setInputValue(data ?? '');
  }, [data]);

  const onBlur = useCallback(
    (value: string) => {
      handleChange(path, value || undefined);
    },
    [handleChange, path],
  );

  return (
    <ControlWrapper {...props}>
      <VariableText
        key={totalVariables}
        value={inputValue}
        onChange={setInputValue}
        onBlur={onBlur}
        variant="text-area"
        suggestionGroups={suggestionGroups}
        hasError={errors.length > 0}
        mentionsInputProps={{ disabled: isDisabled, placeholder }}
      />
    </ControlWrapper>
  );
}

export const variableTextAreaControlRenderer = createControlRenderer('VariableTextArea', VariableTextAreaControl);
