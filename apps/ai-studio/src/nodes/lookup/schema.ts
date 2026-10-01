import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    key: {
      type: 'string',
    },
    records: {
      type: 'string',
    },
  },
} satisfies NodeSchema;

export type LookupSchema = typeof schema;
