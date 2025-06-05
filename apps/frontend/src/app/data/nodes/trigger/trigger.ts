import { PaletteItem } from '@workflow-builder/types/common';
import { defaultPropertiesData } from './default-properties-data';
import { schema, TriggerNodeSchema } from './schema';
import { uischema } from './uischema';

export const triggerNode: PaletteItem<TriggerNodeSchema> = {
  label: 'node.trigger.label',
  description: 'node.trigger.description',
  type: 'trigger',
  icon: 'Lightning',
  defaultPropertiesData,
  schema,
  uischema,
};
