import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

export const schema = {
  properties: {
    ...sharedProperties,
    conditionsArray: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          x: { type: 'string' },
          comparisonOperator: { type: 'string' },
          y: { type: 'string' },
          logicalOperator: { type: 'string' },
        },
      },
    },
  },
} satisfies NodeSchema;

export type ConditionalNodeSchema = typeof schema;
