import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { ConditionNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<ConditionNodeSchema>> = {
  label: 'Condition',
  description: 'Evaluates a condition',
  status: 'active',
  condition: '',
};
