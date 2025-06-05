import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { DelayNodeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<DelayNodeSchema> = {
  label: 'node.delay.label',
  description: 'node.delay.description',
  status: 'active',
  duration: {
    timeUnits: 'none',
    delayAmount: 3,
    maxWaitTime: '24',
    expression: 'order.processing_time * 2',
  },
};
