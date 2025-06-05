import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { AiAgentNodeSchema } from './schema';
import { statusOptions } from '../shared/general-information';

export const defaultPropertiesData: NodeDataProperties<AiAgentNodeSchema> = {
  status: statusOptions.active.value,
};
