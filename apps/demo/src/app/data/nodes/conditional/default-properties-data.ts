import type { NodeDataProperties } from '@workflowbuilder/sdk';

import { type ConditionalNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<ConditionalNodeSchema>> = {
  label: 'node.conditional.label',
  description: 'node.conditional.description',
  conditionsArray: [],
};
