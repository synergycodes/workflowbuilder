import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type TriggerNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const trigger: PaletteItem<TriggerNodeSchema> = {
  type: 'trigger',
  icon: 'Lightning',
  label: 'Trigger',
  description: 'Starts the workflow',
  defaultPropertiesData,
  schema,
  uischema,
  // What the run's trigger payload carries. Listed so a decision node's condition editor
  // offers these fields in its variable picker.
  outputSchema: {
    type: 'default',
    properties: {
      amount: { type: 'number', label: 'Amount', description: 'Value of the request' },
      customer: { type: 'string', label: 'Customer', description: 'Who sent it' },
    },
  },
};
