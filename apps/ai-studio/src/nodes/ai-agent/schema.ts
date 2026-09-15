import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

// Kept as a plain string (not an enum) so a provider added later, or a custom
// OpenAI-compatible endpoint, doesn't require a schema migration to unlock.
const providerOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
];

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
    model: {
      type: 'string',
    },
    provider: {
      type: 'string',
      options: providerOptions,
    },
  },
} satisfies NodeSchema;

export type AiAgentSchema = typeof schema;
