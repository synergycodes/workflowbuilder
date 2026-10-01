import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { LookupSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<LookupSchema> = {
  label: 'Lookup',
  description: '',
  key: '',
  records: '',
};
