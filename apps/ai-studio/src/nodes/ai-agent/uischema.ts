import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import { responseOptions } from '../../utils/ai-agent/response-options';
import type { AiAgentSchema } from './schema';

const scope = getScope<AiAgentSchema>;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.label'),
      label: 'Title',
      placeholder: 'Node Title...',
    },
    {
      type: 'Select',
      scope: scope('properties.agentType'),
      label: 'Agent type',
      options: responseOptions,
    },
    {
      type: 'TextArea',
      scope: scope('properties.systemPrompt'),
      label: 'System Prompt',
      placeholder: 'Describe what the AI should do...',
      minRows: 5,
      maxRows: 14,
    },
    {
      type: 'Switch',
      scope: scope('properties.webSearch'),
      label: 'Web search (let the agent look things up)',
    },
  ],
};
