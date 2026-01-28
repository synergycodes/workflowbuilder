import { NodeDataProperties } from '@/features/json-form/types/default-properties';

import { statusOptions } from '../shared/general-information';
import { DecisionNodeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<DecisionNodeSchema> = {
  status: statusOptions.active.value,
  decisionBranches: [],
};
