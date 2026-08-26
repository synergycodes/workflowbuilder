import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
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
};
