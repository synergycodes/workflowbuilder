import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type NotificationNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const notification: PaletteItem<NotificationNodeSchema> = {
  label: 'node.notification.label',
  description: 'node.notification.description',
  type: 'notification',
  icon: 'PaperPlaneRight',
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    type: 'default',
    bySourceHandle: {
      success: {
        type: 'object',
        properties: {
          sent: {
            type: 'boolean',
            title: 'Sent',
            description: 'Whether the notification was sent successfully',
          },
          sentAt: {
            type: 'string',
            format: 'date-time',
            title: 'Sent At',
            description: 'ISO 8601 date-time when the notification was sent',
          },
          recipient: {
            type: 'string',
            format: 'email',
            title: 'Recipient',
            description: 'The email address the notification was sent to',
          },
        },
      },
    },
  },
};
