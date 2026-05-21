import { sharedProperties, statusOptions } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

export const notificationTypeOptions = {
  email: { label: 'Email', value: 'email', icon: 'EnvelopeSimple' },
  sms: { label: 'SMS', value: 'sms', icon: 'ChatTeardropDots' },
  pushNotification: {
    label: 'Push Notification',
    value: 'pushNotification',
    icon: 'Bell',
  },
  webhook: { label: 'Webhook', value: 'webhook', icon: 'WebhooksLogo' },
  slackMessage: {
    label: 'Slack Message',
    value: 'slackMessage',
    icon: 'SlackLogo',
  },
} as const;

export const priorityOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Low', value: 'low' },
  { label: 'High', value: 'high' },
];

export const schema = {
  properties: {
    ...sharedProperties,
    type: {
      type: 'string',
      options: Object.values(notificationTypeOptions),
      placeholder: 'Select Notification Type',
    },
    status: {
      type: 'string',
      options: Object.values(statusOptions),
    },
    sendEmail: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        copy: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        priority: { type: 'string', options: Object.values(priorityOptions) },
        retries: { type: 'number' },
        retryOnFailure: { type: 'boolean' },
      },
    },
  },
} satisfies NodeSchema;

export type NotificationNodeSchema = typeof schema;
