import { generalInformation, getScope, globalControls } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import { type StepNodeSchema } from './schema';

const scope = getScope<StepNodeSchema>;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    ...globalControls,
    ...(generalInformation ? [generalInformation] : []),
    {
      label: 'Status',
      type: 'Select',
      scope: scope('properties.status'),
    },
  ],
};
