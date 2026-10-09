import { rankWith, uiTypeIs, useSingleSelectedElement, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { JsonFormsRendererExtension } from '@workflowbuilder/sdk';

import { useNodeDecision } from '../../../hooks/use-node-decision';
import { saveDecisionDraft, waitKey } from '../../../stores/use-execution-store';
import { readDecisionOutcome } from '../../../utils/human-decision/decision-outcome';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { proposedValues, withEdits } from '../../../utils/human-decision/decision-values';
import { DecisionForm } from './decision-form';
import { DecisionRecord } from './decision-record';

// The request is read off the selected node, not off `data`: JsonForms updates `data` one render after the selection
// moves, so a form keyed on the new wait would mount with the previous node's schema (see decision-form-panel.test.tsx).
function DecisionFormControl() {
  const node = useSingleSelectedElement()?.node;
  const nodeId = node?.id;
  const request = readDecisionRequest(node?.data.properties['decisionRequest']);
  const decision = useNodeDecision(nodeId, request?.proposalSourceNodeId);

  if (request === undefined || decision.phase === 'none') {
    return null;
  }

  const { schema, actions } = request;
  const { wait } = decision;
  const proposal = proposedValues(decision.sourceOutput, schema);

  if (decision.phase === 'decided') {
    const outcome = readDecisionOutcome(decision.output);
    return outcome === undefined ? null : (
      <DecisionRecord
        // EditorForm holds its schema from mount; the record follows the picks, which change once the lock is lifted.
        key={`${waitKey(wait)}:${JSON.stringify(schema)}`}
        schema={schema}
        values={withEdits(proposal, outcome.edits)}
        reason={outcome.reason}
        comment={outcome.comment}
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
      wait={wait}
    />
  );
}

export const decisionFormRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('DecisionForm')),
  renderer: withJsonFormsControlProps(DecisionFormControl),
};
