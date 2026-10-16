import type { JsonSchema7 } from '@jsonforms/core';
import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

import type { Decision } from '@workflow-builder/types/workflow-execution/decision-request';

// The completion's output is the decision, so `{{ nodes.<id>.action }}` resolves downstream.
export const schemaOutput: NodeSchemaOutput = {
  type: 'variant',
  variants: [
    {
      variantRule: undefined,
      bySourceHandle: {
        every: {
          type: 'object',
          properties: {
            action: { type: 'string', title: 'Action', description: 'The name of the action the person chose' },
            effect: { type: 'string', title: 'Effect', description: 'resume, resume-with-edits or reject' },
            // edits: {
            //   type: 'object',
            //   title: 'Edits',
            //   description: 'Field values the person corrected before approving',
            // },
            reason: {
              type: 'string',
              title: 'Reason',
              description: 'Why the person rejected, when the action requires one',
            },
            comment: { type: 'string', title: 'Comment', description: 'A note the person left with the decision' },
            resolvedBy: {
              type: 'string',
              title: 'Resolved by',
              description: 'Who settled the decision, such as human',
            },
          } satisfies Record<keyof Required<Omit<Decision, 'edits'>>, JsonSchema7>,
        },
      },
    },
    {
      variantRule: {
        fromValueOfPropertyPath: 'editableFields',
        toSourceHandles: ['success'],
      },
    },
  ],
};
