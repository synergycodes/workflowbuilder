import { NodeDataProperties } from '@/features/json-form/types/default-properties';

import { statusOptions } from '../shared/general-information';
import { AiAgentNodeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<AiAgentNodeSchema> = {
  status: statusOptions.active.value,
};
