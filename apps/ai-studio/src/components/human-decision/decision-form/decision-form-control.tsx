import { rankWith, uiTypeIs, useSingleSelectedElement, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';

import { submitDecision } from '../../../adapters/submit-decision';
import { useNodeDecision } from '../../../hooks/use-node-decision';
import { saveDecisionDraft, waitKey } from '../../../stores/use-execution-store';
import { readDecisionOutcome } from '../../../utils/human-decision/decision-outcome';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { proposedValues, withEdits } from '../../../utils/human-decision/decision-values';
import { DecisionForm } from './decision-form';
import { DecisionRecord } from './decision-record';

// Deciding is not editing the diagram: `handleChange` is never called and `enabled` is ignored.
function DecisionFormControl({ data }: ControlProps) {
  const nodeId = useSingleSelectedElement()?.node?.id;
  const request = readDecisionRequest(data);
  const decision = useNodeDecision(nodeId, request?.proposalSourceNodeId);

  if (request === undefined || decision.phase === 'none') {
    return null;
  }

  const { schema, actions } = request;
  const { wait } = decision;
  const proposal = proposedValues(decision.proposal, schema);

  if (decision.phase === 'decided') {
    const outcome = readDecisionOutcome(decision.output);
    return outcome === undefined ? null : (
      <DecisionRecord
        key={waitKey(wait)}
        schema={schema}
        values={withEdits(proposal, outcome.edits)}
        reason={outcome.reason}
      />
    );
  }

  return (
    <DecisionForm
      key={waitKey(wait)}
      schema={schema}
      actions={actions}
      proposal={proposal}
      draft={decision.draft}
      saveDraft={(change) => saveDecisionDraft(wait, change)}
      decide={(input) => submitDecision(wait, input)}
    />
  );
}

export const decisionFormRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('DecisionForm')),
  renderer: withJsonFormsControlProps(DecisionFormControl),
};
