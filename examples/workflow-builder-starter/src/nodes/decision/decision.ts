import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type DecisionNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const decision: PaletteItem<DecisionNodeSchema> = {
  type: 'decision',
  icon: 'ArrowsSplit',
  label: 'Decision',
  description: 'Branches the workflow',
  defaultPropertiesData,
  schema,
  uischema,
};
