import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type ConditionNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const condition: PaletteItem<ConditionNodeSchema> = {
  type: 'condition',
  icon: 'Faders',
  label: 'Condition',
  description: 'Evaluates a condition',
  defaultPropertiesData,
  schema,
  uischema,
};
