import { PaletteItem } from '@workflow-builder/types/common';
import { defaultPropertiesData } from './default-properties-data';
import { NotificationNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const notification: PaletteItem<NotificationNodeSchema> = {
  label: 'node.notification.label',
  description: 'node.notification.description',
  type: 'notification',
  icon: 'PaperPlaneRight',
  defaultPropertiesData,
  schema,
  uischema,
};
