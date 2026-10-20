import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
  type: 'default',
  bySourceHandle: {
    success: {
      type: 'object',
      properties: {
        matchedBranch: {
          type: 'string',
          title: 'Matched branch sourceHandle',
        },
      },
    },
  },
};
