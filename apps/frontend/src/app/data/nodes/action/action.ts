import { PaletteItem } from '@workflow-builder/types/common';

import { defaultPropertiesData } from './default-properties-data';
import { ActionNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const action: PaletteItem<ActionNodeSchema> = {
  type: 'action',
  icon: 'PlayCircle',
  label: 'node.action.label',
  description: 'node.action.description',
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    properties: {
      status: { type: 'string', label: 'Status', description: 'Execution status: success, failure, or skipped' },
      result: { type: 'object', label: 'Result', description: 'The data returned by the action' },
      errorMessage: { type: 'string', label: 'Error Message', description: 'Error details if the action failed' },
    },
  },
};
