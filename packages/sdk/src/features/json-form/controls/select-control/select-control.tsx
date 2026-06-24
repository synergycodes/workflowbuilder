import { Select, type SelectBaseProps } from '@workflowbuilder/ui';

import { Icon } from '@workflow-builder/icons';

import type { PrimitiveFieldSchema } from '../../../../node/node-schema';
import type { SelectControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function SelectControl(props: SelectControlProps) {
  const { data, handleChange, path, enabled, schema, uischema } = props;
  const isDisabled = !enabled || uischema.disabled === true;

  const items = (schema as PrimitiveFieldSchema).options?.map((option) =>
    option.type === 'separator' || !option.icon
      ? option
      : {
          ...option,
          icon: <Icon name={option.icon} />,
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
        disabled={isDisabled}
        onChange={onChange}
        placeholder={schema.placeholder}
      />
    </ControlWrapper>
  );
}

export const selectControlRenderer = createControlRenderer('Select', SelectControl);
