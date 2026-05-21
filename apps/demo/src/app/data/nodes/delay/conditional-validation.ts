/* eslint-disable unicorn/no-thenable */
import type { IfThenElseSchema } from '@workflowbuilder/sdk';

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
