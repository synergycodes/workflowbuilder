import { errorPolicyProperty, sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    ...errorPolicyProperty,
  },
} satisfies NodeSchema;

export type VisualizeSchema = typeof schema;
