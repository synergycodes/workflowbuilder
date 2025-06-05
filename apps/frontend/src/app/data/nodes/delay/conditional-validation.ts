/* eslint-disable unicorn/no-thenable */
import { IfThenElseSchema } from '@workflow-builder/types/node-validation-schema';
import { delayTypeOptions } from './select-options';

export const conditionalValidation = {
  allOf: [
    {
      if: {
        properties: {
          type: { const: delayTypeOptions.fixed.value },
        },
      },
      then: {
        properties: {
          duration: {
            type: 'object',
            required: ['delayAmount'],
            properties: {
              delayAmount: {
                type: 'number',
                minimum: 1,
              },
            },
          },
        },
      },
    },
  ] as IfThenElseSchema[],
};
