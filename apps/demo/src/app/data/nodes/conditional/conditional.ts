import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type ConditionalNodeSchema, schema } from './schema';
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
    type: 'default',
    bySourceHandle: {
      success: {
        type: 'object',
        properties: {
          result: {
            type: 'boolean',
            title: 'Result',
            description: 'Whether the condition evaluated to true or false',
          },
          matchedCondition: {
            type: 'string',
            title: 'Matched Condition',
            description: 'The condition expression that matched',
          },
        },
      },
    },
  },
};
