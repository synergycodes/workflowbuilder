import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type ActionNodeSchema, schema } from './schema';
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
    type: 'default',
    bySourceHandle: {
      success: {
        status: { type: 'string', label: 'Status', description: 'Execution status: success, failure, or skipped' },
        // TODO: outputSchema and schema properties should support the full JsonSchema7 type imported from @jsonforms/core to build suggestions not only for objects but also for their variables.
        result: { type: 'object', label: 'Result', description: 'The data returned by the action' },
      },
      error: {
        errorMessage: { type: 'string', label: 'Error Message', description: 'Error details if the action failed' },
      },
    },
  },
};
