import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

// Opaque here: the backend parses the request, and the properties panel never renders it.
export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    decisionRequest: { type: 'object', properties: {} },
  },
  required: ['decisionRequest'],
} satisfies NodeSchema;

export type HumanDecisionSchema = typeof schema;
