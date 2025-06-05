import { statusOptions } from '../shared/general-information';
import { sharedProperties } from '../shared/shared-properties';
import { NodeSchema } from '@workflow-builder/types/node-schema';

const conditions = {
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
} as const;

const decisionBranches = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      conditions,
    },
  },
} as const;

export const schema = {
  type: 'object',
  required: ['label'],
  properties: {
    ...sharedProperties,
    status: {
      type: 'string',
      options: Object.values(statusOptions),
    },
    decisionBranches,
  },
} satisfies NodeSchema;

export type DecisionNodeSchema = typeof schema;
