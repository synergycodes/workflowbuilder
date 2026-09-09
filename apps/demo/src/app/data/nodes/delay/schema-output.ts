import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
  type: 'default',
  bySourceHandle: {
    success: {
      type: 'object',
      properties: {
        resumedAt: {
          type: 'string',
          format: 'date-time',
          title: 'Resumed At',
          description: 'ISO 8601 date-time when the delay ended',
        },
        delayDuration: {
          type: 'number',
          title: 'Delay Duration',
          description: 'Actual wait time in milliseconds',
        },
      },
    },
  },
};
