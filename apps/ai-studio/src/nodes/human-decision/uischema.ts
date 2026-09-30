import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { HumanDecisionSchema } from './schema';

const scope = getScope<HumanDecisionSchema>;

// Deadline, rerun and action labels are not authorable yet (follow-up: decision-request-properties-ui).
export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    // Not the SDK's `generalInformation`: it adds a Status field and shows only on a node with a `type`.
    {
      type: 'Accordion',
      label: 'General information',
      elements: [
        {
          type: 'Text',
          scope: scope('properties.label'),
          label: 'Title',
          placeholder: 'Node Title...',
        },
        {
          type: 'Text',
          scope: scope('properties.description'),
          label: 'Description',
          placeholder: 'Type your description here...',
        },
      ],
    },
    // Custom elements: the `UISchema` union is closed (follow-up: uischema-custom-element-typing).
    {
      type: 'DecisionFields',
      scope: scope('properties.decisionRequest'),
      label: 'Fields the decider sees',
    } as unknown as UISchema,
    {
      type: 'DecisionActions',
      scope: scope('properties.decisionRequest'),
      label: 'Decider actions',
    } as unknown as UISchema,
    // The run-time decision form.
    { type: 'DecisionForm', scope: scope('properties.decisionRequest') } as unknown as UISchema,
  ],
};
