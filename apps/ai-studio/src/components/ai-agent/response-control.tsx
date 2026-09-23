import { FormControlWithLabel, rankWith, uiTypeIs, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';
import { Select } from '@workflowbuilder/ui';
import type { SelectBaseProps } from '@workflowbuilder/ui';

import { outputSchemaFor, responseOptionOf, responseOptions } from '../../nodes/ai-agent/response-options';

// Edits the node's `outputSchema` as a choice between presets; the schema itself is never typed here.
export function ResponseControl({ data, handleChange, path, enabled, label }: ControlProps) {
  const onChange: SelectBaseProps['onChange'] = (_event, value) => {
    handleChange(path, outputSchemaFor(value));
  };

  return (
    <FormControlWithLabel label={label}>
      <Select value={responseOptionOf(data)} items={responseOptions} disabled={!enabled} onChange={onChange} />
    </FormControlWithLabel>
  );
}

export const responseControlRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('ResponseSelect')),
  renderer: withJsonFormsControlProps(ResponseControl),
};
