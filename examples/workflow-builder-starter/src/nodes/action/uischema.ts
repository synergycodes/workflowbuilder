import { generalInformation, getScope, globalControls } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { ActionNodeSchema } from './schema';

const scope = getScope<ActionNodeSchema>;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    ...globalControls,
    generalInformation,
    {
      type: 'TextArea',
      scope: scope('properties.message'),
      label: 'Message',
      placeholder: 'What should this action do?',
      minRows: 4,
    },
  ],
};
