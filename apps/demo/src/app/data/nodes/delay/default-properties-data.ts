import type { NodeDataProperties } from '@workflowbuilder/sdk';

import { type DelayNodeSchema } from './schema';
import { delayTypeOptions } from './select-options';

export const defaultPropertiesData: Required<NodeDataProperties<DelayNodeSchema>> = {
  label: 'node.delay.label',
  description: 'node.delay.description',
  status: 'active',
  duration: {
    timeUnits: 'none',
    delayAmount: 3,
    maxWaitTime: '24',
    expression: 'order.processing_time * 2',
  },
  type: delayTypeOptions.fixed.value,
};
