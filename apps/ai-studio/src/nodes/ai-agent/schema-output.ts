import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
  type: 'variant',
  variants: [
    {
      variantRule: {
        fromValueOfPropertyPath: 'expectedSchema',
        toSourceHandles: ['success'],
      },
    },
  ],
};
