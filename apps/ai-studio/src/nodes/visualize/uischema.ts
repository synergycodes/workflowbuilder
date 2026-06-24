import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { VisualizeSchema } from './schema';

const scope = getScope<VisualizeSchema>;

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
      type: 'Select',
      scope: scope('properties.errorPolicy'),
      label: 'Error Policy',
    },
  ],
};
