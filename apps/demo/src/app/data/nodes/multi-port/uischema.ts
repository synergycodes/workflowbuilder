import { getScope, globalControls, statusOptions } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { MultiPortNodeSchema } from './schema';

const scope = getScope<MultiPortNodeSchema>;

const generalInformation: UISchema = {
  type: 'Accordion',
  label: 'General Information',
  elements: [
    ...globalControls,
    {
      type: 'Text',
      scope: scope('properties.label'),
      label: 'Title',
      placeholder: 'Node Title...',
    },
    {
      type: 'Select',
      scope: scope('properties.status'),
      label: 'Status',
      options: Object.values(statusOptions),
    },
    {
      type: 'Text',
      scope: scope('properties.description'),
      label: 'Description',
      placeholder: 'Type your description here...',
    },
  ],
} as const;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [generalInformation],
};
