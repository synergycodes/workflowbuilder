import { NodeDataProperties } from '@/features/json-form/types/default-properties';

import { statusOptions } from '../shared/general-information';
import { DecisionNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<DecisionNodeSchema>> = {
  label: 'node.decision.label',
  description: 'node.decision.description',
  status: statusOptions.active.value,
  decisionBranches: [],
};
