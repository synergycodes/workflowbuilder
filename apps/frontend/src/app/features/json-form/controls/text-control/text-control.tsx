import { Input } from '@synergycodes/overflow-ui';
import { ControlWrapper } from '../control-wrapper';
import { TextControlProps } from '../../types/controls';

import { createControlRenderer } from '../../utils/rendering';
import { useEffect, useState } from 'react';

function TextControl(props: TextControlProps) {
  const { schema, uischema, enabled, data, required, errors, path, handleChange } = props;

  const { type } = schema;
  const { placeholder } = uischema;

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
        disabled={!enabled}
        placeholder={placeholder}
      />
    </ControlWrapper>
  );
}

export const textControlRenderer = createControlRenderer('Text', TextControl);
