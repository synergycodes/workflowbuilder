import { sharedProperties, statusOptions } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

import { conditionalValidation } from './conditional-validation';
import { delayTypeOptions, maxWaitTimeOptions, timeUnitsOptions } from './select-options';

export const schema = {
  required: ['label', 'description', 'type', 'status'],
  type: 'object',
  properties: {
    ...sharedProperties,
    type: {
      type: 'string',
      placeholder: 'Select Delay Type...',
      options: Object.values(delayTypeOptions),
    },
    status: {
      type: 'string',
      options: Object.values(statusOptions),
    },
    duration: {
      type: 'object',
      properties: {
        timeUnits: {
          type: 'string',
          options: Object.values(timeUnitsOptions),
        },
        delayAmount: {
          type: 'number',
        },
        expression: {
          type: 'string',
        },
        maxWaitTime: {
          type: 'string',
          options: Object.values(maxWaitTimeOptions),
        },
      },
    },
  },
  ...conditionalValidation,
} satisfies NodeSchema;

export type DelayNodeSchema = typeof schema;
