import { NodeType, type PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type TriggerSchema, schema } from './schema';
import { uischema } from './uischema';

export const triggerPaletteItem: PaletteItem<TriggerSchema> = {
  label: 'AI Studio Trigger',
  description: 'Start the workflow',
  type: 'ai-studio/trigger',
  icon: 'Lightning',
  templateType: NodeType.StartNode,
  defaultPropertiesData,
  schema,
  uischema,
};
