import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { TriggerNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<TriggerNodeSchema>> = {
  label: 'Trigger',
  description: 'Starts the workflow',
  status: 'active',
};
