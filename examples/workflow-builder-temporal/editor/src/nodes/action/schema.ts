import { sharedProperties, statusOptions } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    status: { type: 'string', options: Object.values(statusOptions) },
    message: { type: 'string' },
  },
} satisfies NodeSchema;

export type ActionNodeSchema = typeof schema;
