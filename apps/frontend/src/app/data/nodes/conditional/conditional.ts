import { PaletteItem } from '@workflow-builder/types/common';

import { defaultPropertiesData } from './default-properties-data';
import { ConditionalNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const conditional: PaletteItem<ConditionalNodeSchema> = {
  label: 'node.conditional.label',
  description: 'node.conditional.description',
  type: 'conditional',
  icon: 'ListChecks',
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    properties: {
      result: { type: 'boolean', label: 'Result', description: 'Whether the condition evaluated to true or false' },
      matchedCondition: {
        type: 'string',
        label: 'Matched Condition',
        description: 'The condition expression that matched',
      },
    },
  },
};
