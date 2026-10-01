import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { LookupSchema } from './schema';

const scope = getScope<LookupSchema>;

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
      type: 'Text',
      scope: scope('properties.key'),
      label: 'Key',
      placeholder: 'e.g. ORD-1 or {{…}}',
    },
    {
      type: 'TextArea',
      scope: scope('properties.records'),
      label: 'Records (JSON)',
      placeholder:
        '{\n  "ORD-1": { "customer": "Ada", "total": 120 },\n  "ORD-2": { "customer": "Grace", "total": 80 }\n}',
      minRows: 5,
      maxRows: 14,
    },
  ],
};
