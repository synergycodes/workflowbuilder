import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type StepNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const step: PaletteItem<StepNodeSchema> = {
  type: 'step',
  icon: 'Circle',
  label: 'Step',
  description: 'A workflow step',
  defaultPropertiesData,
  schema,
  uischema,
};
