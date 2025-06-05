import { NodeSchema } from '@workflow-builder/types/node-schema';
import { sharedProperties } from '../shared/shared-properties';
import { statusOptions } from '../shared/general-information';
import { chatModelOptions, memoryOptions } from './select-options';

export const schema = {
  required: ['label', 'chatModel', 'memory'],
  type: 'object',
  properties: {
    ...sharedProperties,
    status: {
      type: 'string',
      options: Object.values(statusOptions),
    },
    chatModel: {
      type: 'string',
      options: Object.values(chatModelOptions),
      placeholder: 'Add Chat Model',
    },
    tools: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          tool: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          apiKey: {
            type: 'string',
          },
        },
      },
    },
    memory: {
      type: 'string',
      options: Object.values(memoryOptions),
      placeholder: 'Add memory',
    },
    systemPrompt: {
      type: 'string',
    },
  },
} satisfies NodeSchema;

export type AiAgentNodeSchema = typeof schema;
