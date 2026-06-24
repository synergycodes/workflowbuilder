import { TextArea } from '@workflowbuilder/ui';
import { useEffect, useState } from 'react';

import type { TextAreaControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function TextAreaControl(props: TextAreaControlProps) {
  const { data, handleChange, path, enabled, uischema } = props;
  const { placeholder, minRows, disabled } = uischema;
  const isDisabled = !enabled || disabled === true;

  const [inputValue, setInputValue] = useState<string>(data);

  function onChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(event.target.value);
  }

  function onBlur() {
    handleChange(path, inputValue);
  }

  useEffect(() => {
    setInputValue(data);
  }, [data]);

  return (
    <ControlWrapper {...props}>
      <TextArea
        disabled={isDisabled}
        value={inputValue}
        minRows={minRows}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        size="medium"
      />
    </ControlWrapper>
  );
}

export const textAreaControlRenderer = createControlRenderer('TextArea', TextAreaControl);
