import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type DelayNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const delay: PaletteItem<DelayNodeSchema> = {
  label: 'node.delay.label',
  description: 'node.delay.description',
  type: 'delay',
  icon: 'Timer',
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    type: 'default',
    bySourceHandle: {
      success: {
        type: 'object',
        properties: {
          resumedAt: {
            type: 'string',
            format: 'date-time',
            title: 'Resumed At',
            description: 'ISO 8601 date-time when the delay ended',
          },
          delayDuration: {
            type: 'number',
            title: 'Delay Duration',
            description: 'Actual wait time in milliseconds',
          },
        },
      },
    },
  },
};
