import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { TriggerNodeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<TriggerNodeSchema> = {
  label: 'node.trigger.label',
  description: 'node.trigger.description',
  status: 'active',
  timeSchedule: {
    allDay: false,
    frequency: 'none',
    allDayFrequency: 'none',
  },
  retrySettings: {
    interval: 'every15min',
    retries: '5',
    timeout: '30Min',
  },
};
