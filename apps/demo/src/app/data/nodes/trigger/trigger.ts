import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type TriggerNodeSchema, schema } from './schema';
import { schemaOutput } from './schema-output';
import { uischema } from './uischema';

export const triggerNode: PaletteItem<TriggerNodeSchema> = {
  label: 'node.trigger.label',
  description: 'node.trigger.description',
  type: 'trigger',
  icon: 'Lightning',
  isStartNode: true,
  defaultPropertiesData,
  schema,
  schemaOutput,
  uischema,
};
