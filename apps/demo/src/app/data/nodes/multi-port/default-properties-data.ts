import { statusOptions } from '@workflowbuilder/sdk';
import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { MultiPortNodeSchema } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<MultiPortNodeSchema>> = {
  label: 'Multi-port Node',
  description: 'Routes connections through 4 ports',
  status: statusOptions.active.value,
};
