import { statusOptions } from '@workflowbuilder/sdk';
import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { AiAgentNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<AiAgentNodeSchema>> = {
  label: 'nodes.aiAgent.label',
  description: 'nodes.aiAgent.description',
  status: statusOptions.active.value,
  chatModel: '',
  memory: '',
  systemPrompt: '',
  tools: [],
};
