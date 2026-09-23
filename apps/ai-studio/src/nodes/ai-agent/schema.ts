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
    // JSON Schema of this node's output; the worker forwards it to the model unchanged.
    outputSchema: { type: 'object', properties: {} },
  },
} satisfies NodeSchema;

export type AiAgentSchema = typeof schema;
