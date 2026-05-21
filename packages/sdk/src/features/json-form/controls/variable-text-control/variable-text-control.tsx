import { useCallback, useEffect, useState } from 'react';

import { VariableText } from '../../../../features/variables/components/variable-text/variable-text';
import { variablesTypesToExcludeInText } from '../../../../features/variables/constants';
import { useAvailableVariables } from '../../../../features/variables/hooks/use-available-variables';
import { useSingleSelectedElement } from '../../../properties-bar/use-single-selected-element';
import type { VariableTextControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function VariableTextControl(props: VariableTextControlProps) {
  const { data, handleChange, path, errors, enabled, uischema } = props;
  const { placeholder, disabled } = uischema;
  const selection = useSingleSelectedElement();
  // TODO: add param to pick what type of variables are available
  const suggestionGroups = useAvailableVariables(selection?.node?.id, variablesTypesToExcludeInText);

  const isDisabled = !enabled || disabled === true;

  const [inputValue, setInputValue] = useState(data ?? '');

  useEffect(() => {
    setInputValue(data ?? '');
  }, [data]);

  const onBlur = useCallback(() => {
    handleChange(path, inputValue || undefined);
  }, [handleChange, path, inputValue]);

  return (
    <ControlWrapper {...props}>
      <VariableText
        value={inputValue}
        onChange={setInputValue}
        variant="text"
        suggestionGroups={suggestionGroups}
        hasError={errors.length > 0}
        mentionsInputProps={{ disabled: isDisabled, placeholder, onBlur }}
      />
    </ControlWrapper>
  );
}

export const variableTextControlRenderer = createControlRenderer('VariableText', VariableTextControl);
