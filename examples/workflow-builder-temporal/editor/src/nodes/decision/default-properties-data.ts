import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { DecisionNodeSchema } from './schema';

// No branches by default: a branch seeded here would carry a reference to a node id that only
// exists in this sample's diagram. Add branches on the node itself or in the properties panel.
export const defaultPropertiesData: Required<NodeDataProperties<DecisionNodeSchema>> = {
  label: 'Decision',
  description: 'Routes to one branch',
  status: 'active',
  decisionBranches: [],
};
