import { FormControlWithLabel, rankWith, uiTypeIs, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';
import { Select } from '@workflowbuilder/ui';
import type { SelectBaseProps } from '@workflowbuilder/ui';

import {
  customResponseOption,
  outputSchemaFor,
  responseOptionOf,
  responseOptions,
} from '../../utils/ai-agent/response-options';

// Fixed length: a mounted Base UI Select resets its value when its items change, and the reset arrives as a change.
const items = [...responseOptions, customResponseOption];

// Edits the node's `outputSchema` as a choice between presets; the schema itself is never typed here.
export function ResponseControl({ data, handleChange, path, enabled, label }: ControlProps) {
  const current = responseOptionOf(data);

  // Base UI reports a click on the selected item as a change.
  const onChange: SelectBaseProps['onChange'] = (_event, value) => {
    if (value === current) return;
    handleChange(path, outputSchemaFor(value));
  };

  return (
    <FormControlWithLabel label={label}>
      <Select value={current} items={items} disabled={!enabled} onChange={onChange} />
    </FormControlWithLabel>
  );
}

export const responseControlRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('ResponseSelect')),
  renderer: withJsonFormsControlProps(ResponseControl),
};
