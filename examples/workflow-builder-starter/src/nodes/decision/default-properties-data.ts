import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { DecisionNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<DecisionNodeSchema>> = {
  label: 'Decision',
  description: 'Branches the workflow',
  status: 'active',
  condition: '',
};
