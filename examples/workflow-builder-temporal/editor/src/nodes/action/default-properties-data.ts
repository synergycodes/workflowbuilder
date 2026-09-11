import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { ActionNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<ActionNodeSchema>> = {
  label: 'Action',
  description: 'Performs a task',
  status: 'active',
  message: '',
};
