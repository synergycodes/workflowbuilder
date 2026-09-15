import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
  type: 'default',
  bySourceHandle: {
    success: {
      type: 'object',
      properties: {
        result: {
          type: 'object',
          title: 'Result',
          description: 'The data returned by the action',
          properties: {
            status: {
              type: 'string',
              title: 'Status',
              description: 'Execution status: success, failure, or skipped',
            },
          },
        },
      },
    },
    error: {
      type: 'object',
      properties: {
        errorMessage: {
          type: 'string',
          title: 'Error Message',
          description: 'Error details if the action failed',
        },
      },
    },
  },
};
