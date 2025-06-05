import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { NotificationNodeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<NotificationNodeSchema> = {
  label: 'node.notification.label',
  description: 'node.notification.description',
  status: 'active',
  sendEmail: {
    priority: 'normal',
    retryOnFailure: false,
    retries: 3,
  },
};
