import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
  type: 'default',
  bySourceHandleType: {
    settled: {
      type: 'object',
      properties: {
        selectedBranch: {
          type: 'string',
          title: 'Selected Branch',
          description: 'Label of the branch that was taken',
        },
        branchIndex: {
          type: 'number',
          title: 'Branch Index',
          description: 'Zero-based index of the selected branch',
        },
      },
    },
  },
};
