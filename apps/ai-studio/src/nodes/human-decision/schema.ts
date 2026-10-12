import { sharedProperties, variableListSchema } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

// Opaque to the editor: the backend parses the request, and the decision form reads it with its own reader.
export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    decisionRequest: { type: 'object', properties: {} },
    editableFields: variableListSchema,
  },
  required: ['decisionRequest'],
} satisfies NodeSchema;

export type HumanDecisionSchema = typeof schema;
