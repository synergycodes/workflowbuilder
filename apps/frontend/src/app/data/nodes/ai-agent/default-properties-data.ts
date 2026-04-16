import { NodeDataProperties } from '@/features/json-form/types/default-properties';

import { statusOptions } from '../shared/general-information';
import { AiAgentNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<AiAgentNodeSchema>> = {
  label: 'nodes.aiAgent.label',
  description: 'nodes.aiAgent.description',
  status: statusOptions.active.value,
  chatModel: '',
  memory: '',
  systemPrompt: '',
  tools: [],
};
