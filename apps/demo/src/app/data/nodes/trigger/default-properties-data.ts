import type { NodeDataProperties } from '@workflowbuilder/sdk';

import { type TriggerNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<TriggerNodeSchema>> = {
  label: 'node.trigger.label',
  description: 'node.trigger.description',
  type: 'timeBasedTrigger',
  status: 'active',
  timeSchedule: {
    allDay: false,
    starts: { time: '', date: '' },
    ends: { time: '', date: '' },
    allDayFrequency: 'none',
    frequency: 'none',
  },
  retrySettings: {
    interval: 'every15min',
    retries: '5',
    timeout: '30Min',
  },
  eventType: '',
  condition: { rule: '', value: '' },
  systemValue: '',
};
