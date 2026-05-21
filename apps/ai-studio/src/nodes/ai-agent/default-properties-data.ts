import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { AiAgentSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<AiAgentSchema> = {
  label: 'AI Agent',
  description: '',
  systemPrompt: '',
  errorPolicy: 'fail',
};
