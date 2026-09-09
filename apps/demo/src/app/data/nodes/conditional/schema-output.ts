import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
  type: 'default',
  bySourceHandle: {
    success: {
      type: 'object',
      properties: {
        result: {
          type: 'boolean',
          title: 'Result',
          description: 'Whether the condition evaluated to true or false',
        },
        matchedCondition: {
          type: 'string',
          title: 'Matched Condition',
          description: 'The condition expression that matched',
        },
      },
    },
  },
};
