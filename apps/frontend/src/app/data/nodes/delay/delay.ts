import { PaletteItem } from '@workflow-builder/types/common';

import { defaultPropertiesData } from './default-properties-data';
import { DelayNodeSchema, schema } from './schema';
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
    properties: {
      resumedAt: { type: 'string', label: 'Resumed At', description: 'ISO 8601 date-time when the delay ended' },
      delayDuration: { type: 'number', label: 'Delay Duration', description: 'Actual wait time in milliseconds' },
    },
  },
};
