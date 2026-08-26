import { DatePicker, type DatePickerProps } from '@workflowbuilder/ui';

import { useIsControlEditable } from '../../hooks/use-is-control-editable';
import type { DatePickerControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function DatePickerControl(props: DatePickerControlProps) {
  const { data, handleChange, path } = props;
  const isEditable = useIsControlEditable(props);

  const onChange: DatePickerProps['onChange'] = (value) => {
    handleChange(path, value?.toString());
  };

  return (
    <ControlWrapper {...props}>
      <DatePicker value={data} onChange={onChange} disabled={!isEditable} />
    </ControlWrapper>
  );
}

export const datePickerControlRenderer = createControlRenderer('DatePicker', DatePickerControl);
