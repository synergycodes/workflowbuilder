import { UISchema } from '@/features/json-form/types/uischema';
import { getScope } from '@/features/json-form/utils/get-scope';
import { ConditionalNodeSchema } from './schema';

const scope = getScope<ConditionalNodeSchema>;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      label: 'Label',
      type: 'Text',
      scope: scope('properties.label'),
    },
    {
      label: 'Description',
      type: 'Text',
      scope: scope('properties.description'),
      placeholder: 'Type your description here...',
    },
    {
      label: 'Conditions',
      type: 'DynamicConditions',
      scope: scope('properties.conditionsArray'),
    },
  ],
};
