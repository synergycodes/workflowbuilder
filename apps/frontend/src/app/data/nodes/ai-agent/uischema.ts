import { UISchema } from '@/features/json-form/types/uischema';
import { getScope } from '@/features/json-form/utils/get-scope';
import { AiAgentNodeSchema } from './schema';

const scope = getScope<AiAgentNodeSchema>;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Accordion',
      label: 'General Information',
      elements: [
        {
          type: 'Text',
          scope: scope('properties.label'),
          label: 'Title',
          placeholder: 'Node Title...',
        },
        {
          type: 'Select',
          scope: scope('properties.status'),
          label: 'Status',
        },
        {
          type: 'Text',
          scope: scope('properties.description'),
          label: 'Description',
          placeholder: 'Type your description here...',
        },
      ],
    },
    {
      type: 'Accordion',
      label: 'Operational Settings',
      elements: [
        {
          type: 'VerticalLayout',
          elements: [
            {
              type: 'Select',
              scope: scope('properties.chatModel'),
            },
            {
              type: 'Select',
              scope: scope('properties.memory'),
            },
          ],
        },
      ],
    },
    {
      type: 'Accordion',
      label: 'Tools',
      elements: [
        {
          type: 'AiTools',
          scope: scope('properties.tools'),
        },
      ],
    },
    {
      type: 'Accordion',
      label: 'System Prompt',
      elements: [
        {
          type: 'TextArea',
          scope: scope('properties.systemPrompt'),
          placeholder: 'Type your prompt here...',
          minRows: 5,
        },
      ],
    },
  ],
};
