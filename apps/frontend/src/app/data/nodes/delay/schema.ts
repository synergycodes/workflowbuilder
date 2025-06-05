import { sharedProperties } from '../shared/shared-properties';
import { statusOptions } from '../shared/general-information';
import { NodeSchema } from '@workflow-builder/types/node-schema';
import { delayTypeOptions, timeUnitsOptions, maxWaitTimeOptions } from './select-options';
import { conditionalValidation } from './conditional-validation';

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
