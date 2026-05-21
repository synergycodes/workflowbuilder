import type { NodeDataProperties } from '@workflowbuilder/sdk';

import { type NotificationNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<NotificationNodeSchema>> = {
  label: 'node.notification.label',
  description: 'node.notification.description',
  type: 'email',
  status: 'active',
  sendEmail: {
    address: '',
    copy: '',
    subject: '',
    body: '',
    priority: 'normal',
    retries: 3,
    retryOnFailure: false,
  },
};
