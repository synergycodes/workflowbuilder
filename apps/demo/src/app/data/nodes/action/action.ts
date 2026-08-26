import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type ActionNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const action: PaletteItem<ActionNodeSchema> = {
  type: 'action',
  icon: 'PlayCircle',
  label: 'node.action.label',
  description: 'node.action.description',
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    type: 'default',
    bySourceHandle: {
      success: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            title: 'Status',
            description: 'Execution status: success, failure, or skipped',
          },
          result: {
            type: 'object',
            title: 'Result',
            description: 'The data returned by the action',
          },
        },
      },
      error: {
        type: 'object',
        properties: {
          errorMessage: {
            type: 'string',
            title: 'Error Message',
            description: 'Error details if the action failed',
          },
        },
      },
    },
  },
};
