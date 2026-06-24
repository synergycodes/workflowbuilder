import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { VisualizeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<VisualizeSchema> = {
  label: 'Visualize',
  description: '',
  mode: 'auto',
  errorPolicy: 'fail',
};
