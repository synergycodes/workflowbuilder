import { errorPolicyProperty, sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    ...errorPolicyProperty,
    inputPrompt: {
      type: 'string',
    },
  },
} satisfies NodeSchema;

export type TriggerSchema = typeof schema;
