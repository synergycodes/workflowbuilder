import { PaletteItem } from '@workflow-builder/types/common';

import { defaultPropertiesData } from './default-properties-data';
import { TriggerNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const triggerNode: PaletteItem<TriggerNodeSchema> = {
  label: 'node.trigger.label',
  description: 'node.trigger.description',
  type: 'trigger',
  icon: 'Lightning',
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    properties: {
      eventType: { type: 'string', label: 'Event Type', description: 'The type of event that started the workflow' },
      timestamp: { type: 'string', label: 'Timestamp', description: 'ISO 8601 date-time when the trigger fired' },
      payload: { type: 'object', label: 'Payload', description: 'The raw event data received by the trigger' },
    },
  },
};
