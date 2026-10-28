import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

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
      id: { type: 'string' },
      sourceHandle: { type: 'string' },
      label: { type: 'string' },
      conditions,
    },
  },
} as const;

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    decisionBranches,
  },
} satisfies NodeSchema;

export type DecisionSchema = typeof schema;
