import { useCallback, useEffect, useState } from 'react';

import { useSingleSelectedElement } from '../../../../features/properties-bar/use-single-selected-element';
import { VariableText } from '../../../../features/variables/components/variable-text/variable-text';
import {
  VARIABLES_TYPES_EMPTY,
  VARIABLES_TYPES_NUMERIC,
  VARIABLES_TYPES_TO_EXCLUDE_IN_TEXT,
} from '../../../../features/variables/constants';
import { useNodeVariables } from '../../../variables/hooks/use-node-variables';
import type { VariableTextAreaControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function VariableTextAreaControl(props: VariableTextAreaControlProps) {
  const { data, handleChange, path, errors, enabled, uischema, schema } = props;
  const { placeholder, variablesTypes, disabled } = uischema;
  const { type } = schema;
  const selection = useSingleSelectedElement();
  const { suggestionGroups, variablesKey } = useNodeVariables(selection?.node?.id, {
    excludeTypes: variablesTypes ? VARIABLES_TYPES_EMPTY : VARIABLES_TYPES_TO_EXCLUDE_IN_TEXT,
    includeTypes: variablesTypes || (type === 'number' ? VARIABLES_TYPES_NUMERIC : VARIABLES_TYPES_EMPTY),
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
        key={variablesKey}
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
