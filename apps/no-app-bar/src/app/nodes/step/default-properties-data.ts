import type { NodeDataProperties } from '@workflowbuilder/sdk';

import { type StepNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<StepNodeSchema>> = {
  label: 'Step',
  description: 'A workflow step',
  status: 'active',
};
