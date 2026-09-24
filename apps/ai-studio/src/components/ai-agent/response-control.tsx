import { FormControlWithLabel, rankWith, uiTypeIs, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';
import { Select } from '@workflowbuilder/ui';
import type { SelectBaseProps } from '@workflowbuilder/ui';

import { outputSchemaFor, responseOptionOf, responseOptions } from '../../utils/ai-agent/response-options';

// Edits the node's `outputSchema` as a choice between presets; the schema itself is never typed here.
export function ResponseControl({ data, handleChange, path, enabled, label }: ControlProps) {
  // Base UI reports a click on the selected item as a change; writing the same value would still add an undo step.
  const onChange: SelectBaseProps['onChange'] = (_event, value) => {
    const outputSchema = outputSchemaFor(value);
    if (outputSchema === data) return;
    handleChange(path, outputSchema);
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
