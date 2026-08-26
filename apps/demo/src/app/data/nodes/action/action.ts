import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type ActionNodeSchema, schema } from './schema';
import { schemaOutput } from './schema-output';
import { uischema } from './uischema';

export const action: PaletteItem<ActionNodeSchema> = {
  type: 'action',
  icon: 'PlayCircle',
  label: 'node.action.label',
  description: 'node.action.description',
  defaultPropertiesData,
  schema,
  schemaOutput,
  uischema,
};
