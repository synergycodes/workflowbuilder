import { statusOptions } from '@workflowbuilder/sdk';
import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { DecisionNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<DecisionNodeSchema>> = {
  label: 'node.decision.label',
  description: 'node.decision.description',
  status: statusOptions.active.value,
  decisionBranches: [],
};
