import type { PaletteItem } from '@workflowbuilder/sdk';

import type { Decision } from '@workflow-builder/types/workflow-execution/decision-request';

import { defaultPropertiesData } from './default-properties-data';
import { type HumanDecisionSchema, schema } from './schema';
import { uischema } from './uischema';

// Also the key of the node's template in `nodeTemplates`; a custom template keyed by the palette type wins.
export const humanDecisionNodeType = 'ai-studio/human-decision';

type OutputProperty = Extract<
  NonNullable<PaletteItem<HumanDecisionSchema>['outputSchema']>,
  { type: 'default' }
>['properties'][string];

export const humanDecisionPaletteItem: PaletteItem<HumanDecisionSchema> = {
  label: 'Human decision',
  description: 'A person decides before the run continues',
  type: humanDecisionNodeType,
  icon: 'UserCheck',
  defaultPropertiesData,
  schema,
  uischema,
  // The completion's output is the decision, so `{{ nodes.<id>.action }}` resolves downstream.
  outputSchema: {
    type: 'default',
    properties: {
      action: { type: 'string', label: 'Action', description: 'The name of the action the person chose' },
      effect: { type: 'string', label: 'Effect', description: 'resume, resume-with-edits or reject' },
      edits: { type: 'object', label: 'Edits', description: 'Field values the person corrected before approving' },
      reason: { type: 'string', label: 'Reason', description: 'Why the person rejected, when the action requires one' },
      comment: { type: 'string', label: 'Comment', description: 'A note the person left with the decision' },
      resolvedBy: { type: 'string', label: 'Resolved by', description: 'Who settled the decision, such as human' },
    } satisfies Record<keyof Required<Decision>, OutputProperty>,
  },
};
