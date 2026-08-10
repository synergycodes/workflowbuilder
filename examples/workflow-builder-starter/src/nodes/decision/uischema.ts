import { generalInformation, getScope, globalControls } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { DecisionNodeSchema } from './schema';

const scope = getScope<DecisionNodeSchema>;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    ...globalControls,
    generalInformation,
    {
      type: 'Text',
      scope: scope('properties.condition'),
      label: 'Condition',
      placeholder: 'e.g. amount > 100',
    },
  ],
};
