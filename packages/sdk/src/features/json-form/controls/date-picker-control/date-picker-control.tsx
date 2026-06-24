import { DatePicker, type DatePickerProps } from '@workflowbuilder/ui';

import type { DatePickerControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function DatePickerControl(props: DatePickerControlProps) {
  const { data, handleChange, path, enabled, uischema } = props;
  const isDisabled = !enabled || uischema.disabled === true;

  const onChange: DatePickerProps['onChange'] = (value) => {
    handleChange(path, value?.toString());
  };

  return (
    <ControlWrapper {...props}>
      <DatePicker value={data} onChange={onChange} disabled={isDisabled} />
    </ControlWrapper>
  );
}

export const datePickerControlRenderer = createControlRenderer('DatePicker', DatePickerControl);
