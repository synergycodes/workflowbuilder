import { rankWith, uiTypeIs, useSingleSelectedElement, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';

import { usePendingDecision } from '../../../hooks/use-pending-decision';
import { fieldsOf, isDecisionRequest } from './decision-fields';
import { DecisionForm } from './decision-form';
import { initialValues } from './decision-values';

// Deciding is not editing the diagram: `handleChange` is never called and `enabled` is ignored.
export function DecisionFormControl({ data }: ControlProps) {
  const nodeId = useSingleSelectedElement()?.node?.id;
  const request = isDecisionRequest(data) ? data : undefined;
  const pending = usePendingDecision(nodeId, request);

  if (nodeId === undefined || request === undefined || !pending.isWaiting) {
    return null;
  }

  const fields = fieldsOf(request);
  return (
    <DecisionForm
      key={`${pending.executionId}:${nodeId}:${pending.attempt}`}
      fields={fields}
      initialValues={initialValues(pending.proposal, fields)}
    />
  );
}

export const decisionFormRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('DecisionForm')),
  renderer: withJsonFormsControlProps(DecisionFormControl),
};
