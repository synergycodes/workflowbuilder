import { TextArea } from '@workflowbuilder/ui';
import { useEffect, useState } from 'react';

import { useIsControlEditable } from '../../hooks/use-is-control-editable';
import type { TextAreaControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function TextAreaControl(props: TextAreaControlProps) {
  const { data, handleChange, path, uischema } = props;
  const { placeholder, minRows, maxRows } = uischema;
  const isEditable = useIsControlEditable(props);

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
        disabled={!isEditable}
        value={inputValue}
        minRows={minRows}
        maxRows={maxRows}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        size="medium"
      />
    </ControlWrapper>
  );
}

export const textAreaControlRenderer = createControlRenderer('TextArea', TextAreaControl);
