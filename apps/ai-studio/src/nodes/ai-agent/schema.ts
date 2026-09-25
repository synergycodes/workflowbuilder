import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    systemPrompt: {
      type: 'string',
    },
    webSearch: {
      type: 'boolean',
    },
    // The JSON Schema asked of the model. Unrelated to the palette item's `outputSchema`, the editor's variables.
    outputSchema: { type: 'object', properties: {} },
  },
} satisfies NodeSchema;

export type AiAgentSchema = typeof schema;
