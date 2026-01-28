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
};
