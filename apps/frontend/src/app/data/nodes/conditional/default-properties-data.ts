import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { ConditionalNodeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<ConditionalNodeSchema> = {
  label: 'node.conditional.label',
  description: 'node.conditional.description',
  conditionsArray: [],
};
