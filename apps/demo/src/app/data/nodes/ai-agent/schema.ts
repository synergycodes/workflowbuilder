import { sharedProperties, statusOptions } from '@workflowbuilder/sdk';
import type { NodeSchema, Option } from '@workflowbuilder/sdk';

const chatModelOptions: Option[] = [
  { label: 'GPT-5.4', value: 'gpt5.4', icon: 'OpenAiLogo' },
  { label: 'Gemini 3.1 Pro', value: 'gemini3.1pro', icon: 'GeminiLogo' },
  { label: 'Claude Sonnet 4.6', value: 'claudeSonnet4.6', icon: 'ClaudeLogo' },
];

const memoryOptions: Option[] = [{ label: 'Window-based Memory', value: 'system', icon: 'Database' }];

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
      options: chatModelOptions,
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
          sourceHandle: {
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
      options: memoryOptions,
      placeholder: 'Add memory',
    },
    systemPrompt: {
      type: 'string',
    },
  },
} satisfies NodeSchema;

export type AiAgentNodeSchema = typeof schema;
