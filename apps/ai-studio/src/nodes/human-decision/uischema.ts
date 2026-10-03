import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { HumanDecisionSchema } from './schema';

const scope = getScope<HumanDecisionSchema>;

// Authoring the rest of the request lands later (follow-up: decision-request-properties-ui).
export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.label'),
      label: 'Title',
      placeholder: 'Node Title...',
    },
    // Custom elements: the `UISchema` union is closed (follow-up: uischema-custom-element-typing).
    {
      type: 'DecisionFields',
      scope: scope('properties.decisionRequest'),
      label: 'Fields the decider sees',
    } as unknown as UISchema,
    // The run-time decision form.
    { type: 'DecisionForm', scope: scope('properties.decisionRequest') } as unknown as UISchema,
  ],
};
