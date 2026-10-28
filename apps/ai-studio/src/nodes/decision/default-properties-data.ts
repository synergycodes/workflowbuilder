import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { DecisionSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<DecisionSchema> = {
  label: 'Decision',
  description: '',
  decisionBranches: [],
};
