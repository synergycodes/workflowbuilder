import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

import { responseOptionsAll } from '../../utils/ai-agent/response-options';

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
    expectedSchemaType: {
      type: 'string',
    },
    // The JSON Schema asked of the model.
    expectedSchema: { type: 'object', properties: {} },
  },
} satisfies NodeSchema;

export type AiAgentSchema = typeof schema;
