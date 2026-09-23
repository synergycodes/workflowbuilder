import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

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
      type: 'TextArea',
      scope: scope('properties.systemPrompt'),
      label: 'System Prompt',
      placeholder: 'Describe what the AI should do...',
      minRows: 5,
      maxRows: 14,
    },
    { type: 'ResponseSelect', scope: scope('properties.outputSchema'), label: 'Response' } as unknown as UISchema,
    {
      type: 'Switch',
      scope: scope('properties.webSearch'),
      label: 'Web search (let the agent look things up)',
    },
  ],
};
