import type { UISchema } from '@workflowbuilder/sdk';
import { getScope, globalControls } from '@workflowbuilder/sdk';

import type { ConditionNodeSchema } from './schema';

const scope = getScope<ConditionNodeSchema>;

const generalInformation: UISchema = {
  type: 'Accordion',
  label: 'General Information',
  elements: [
    { type: 'Text', scope: scope('properties.label'), label: 'Title' },
    { type: 'Select', scope: scope('properties.status'), label: 'Status' },
    { type: 'Text', scope: scope('properties.description'), label: 'Description' },
  ],
};

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
