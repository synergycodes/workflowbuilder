import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type ConditionalNodeSchema, schema } from './schema';
import { schemaOutput } from './schema-output';
import { uischema } from './uischema';

export const conditional: PaletteItem<ConditionalNodeSchema> = {
  label: 'node.conditional.label',
  description: 'node.conditional.description',
  type: 'conditional',
  icon: 'ListChecks',
  defaultPropertiesData,
  schema,
  schemaOutput,
  uischema,
};
