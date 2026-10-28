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
};
