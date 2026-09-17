import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { HumanDecisionSchema } from './schema';

const scope = getScope<HumanDecisionSchema>;

// Authoring the request itself lands later (follow-up: decision-request-properties-ui).
export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.label'),
      label: 'Title',
      placeholder: 'Node Title...',
    },
  ],
};
