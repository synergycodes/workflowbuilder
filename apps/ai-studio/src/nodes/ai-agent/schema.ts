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
  },
} satisfies NodeSchema;

export type AiAgentSchema = typeof schema;
