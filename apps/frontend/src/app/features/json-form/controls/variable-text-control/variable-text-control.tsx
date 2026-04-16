import { useCallback, useEffect, useState } from 'react';

import { useAvailableVariables } from '@/components/form/variable-text/use-available-variables';
import { VariableText } from '@/components/form/variable-text/variable-text';

import { VariableTextControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function VariableTextControl(props: VariableTextControlProps) {
  const { data, handleChange, path, errors, enabled, uischema } = props;
  const { placeholder } = uischema;
  const suggestionGroups = useAvailableVariables();

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
        mentionsInputProps={{ disabled: !enabled, placeholder, onBlur }}
      />
    </ControlWrapper>
  );
}

export const variableTextControlRenderer = createControlRenderer('VariableText', VariableTextControl);
