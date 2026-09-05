import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type NotificationNodeSchema, schema } from './schema';
import { schemaOutput } from './schema-output';
import { uischema } from './uischema';

export const notification: PaletteItem<NotificationNodeSchema> = {
  label: 'node.notification.label',
  description: 'node.notification.description',
  type: 'notification',
  icon: 'PaperPlaneRight',
  defaultPropertiesData,
  schema,
  schemaOutput,
  uischema,
};
