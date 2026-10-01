import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { TriggerSchema } from './schema';

const scope = getScope<TriggerSchema>;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.label'),
      label: 'Title',
      placeholder: 'Node Title...',
    },
    {
      type: 'TextArea',
      scope: scope('properties.inputPrompt'),
      label: 'Input',
      placeholder:
        'Paste the input data here (e.g. email content)... Paste a JSON object to read its fields as {{trigger.<field>}}.',
      minRows: 5,
      maxRows: 14,
    },
  ],
};
