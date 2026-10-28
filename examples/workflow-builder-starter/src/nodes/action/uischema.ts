import type { UISchema } from '@workflowbuilder/sdk';
import { getScope, globalControls } from '@workflowbuilder/sdk';

import type { ActionNodeSchema } from './schema';

const scope = getScope<ActionNodeSchema>;

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
      type: 'TextArea',
      scope: scope('properties.message'),
      label: 'Message',
      placeholder: 'What should this action do?',
      minRows: 4,
    },
  ],
};
