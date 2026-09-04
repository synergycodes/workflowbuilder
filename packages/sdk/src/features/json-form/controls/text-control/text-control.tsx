import { Input } from '@workflowbuilder/ui';
import { useEffect, useState } from 'react';

import { useIsControlEditable } from '../../hooks/use-is-control-editable';
import type { TextControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function TextControl(props: TextControlProps) {
  const { schema, uischema, data, required, errors, path, handleChange } = props;
  const { type } = schema;
  const { placeholder } = uischema;
  const isEditable = useIsControlEditable(props);

  const isNumberInput = type === 'number';
  const hasErrors = errors.length > 0;

  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    if (data == null) {
      setInputValue('');
    } else {
      setInputValue(String(data));
    }
  }, [data]);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

  function onBlur() {
    const trimmed = inputValue.trim();

    if (trimmed === '') {
      // eslint-disable-next-line unicorn/no-useless-undefined
      handleChange(path, undefined);
    } else if (isNumberInput) {
      const number_ = Number(trimmed);
      handleChange(path, Number.isNaN(number_) ? undefined : number_);
    } else {
      handleChange(path, trimmed);
    }
  }

  return (
    <ControlWrapper {...props}>
      <Input
        type={isNumberInput ? 'number' : 'text'}
        required={required}
        value={inputValue}
        onChange={onChange}
        onBlur={onBlur}
        error={hasErrors}
        disabled={!isEditable}
        placeholder={placeholder}
      />
    </ControlWrapper>
  );
}

export const textControlRenderer = createControlRenderer('Text', TextControl);
