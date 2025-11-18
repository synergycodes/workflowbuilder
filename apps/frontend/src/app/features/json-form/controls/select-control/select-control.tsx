import { SelectControlProps } from '../../types/controls';

import { createControlRenderer } from '../../utils/rendering';
import { Select, SelectBaseProps } from '@synergycodes/overflow-ui';
import { ControlWrapper } from '../control-wrapper';
import { PrimitiveFieldSchema } from '@workflow-builder/types/node-schema';
import { Icon } from '@workflow-builder/icons';

function SelectControl(props: SelectControlProps) {
  const { data, handleChange, path, enabled, schema } = props;

  const items = (schema as PrimitiveFieldSchema).options?.map((option) =>
    option.type === 'separator' || !option.icon
      ? option
      : {
          ...option,
          icon: <Icon name={option.icon} size="small" />,
        },
  );

  const onChange: SelectBaseProps['onChange'] = (_event, value) => {
    handleChange(path, value);
  };

  return (
    <ControlWrapper {...props}>
      <Select
        value={data ?? null}
        items={items ?? []}
        disabled={!enabled}
        onChange={onChange}
        placeholder={schema.placeholder}
      />
    </ControlWrapper>
  );
}

export const selectControlRenderer = createControlRenderer('Select', SelectControl);
