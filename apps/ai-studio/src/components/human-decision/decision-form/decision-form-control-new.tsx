import { rankWith, uiTypeIs, useSingleSelectedElement, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { JsonFormsRendererExtension } from '@workflowbuilder/sdk';
import { useMemo } from 'react';

import { DECISION_PHASE } from '../../../hooks/node-decision/types';
import { getFieldPicks } from '../../../hooks/node-decision/utils/get-field-picks';
import { useNodeDecisionNew } from '../../../hooks/use-node-decision-new';
import { saveDecisionDraft, waitKey } from '../../../stores/use-execution-store';
import { readDecisionOutcome } from '../../../utils/human-decision/decision-outcome';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { withEdits } from '../../../utils/human-decision/decision-values';
import { DecisionForm } from './decision-form';
import { DecisionRecord } from './decision-record';

// The picks and the request are read off the selected node, not off `data`: JsonForms updates `data` one render after
// the selection moves, so a form keyed on the new wait would mount with the previous node's fields.
function DecisionFormControlNew() {
  const node = useSingleSelectedElement()?.node;
  const nodeId = node?.id;
  const request = readDecisionRequest(node?.data.properties['decisionRequest']);
  const editableFields = node?.data.properties['editableFields'];
  const picks = useMemo(() => getFieldPicks(editableFields), [editableFields]);
  const decision = useNodeDecisionNew(nodeId, picks);

  if (request === undefined || decision.phase === DECISION_PHASE.NONE) {
    return null;
  }

  const { wait, schema, proposal } = decision;

  if (decision.phase === DECISION_PHASE.DECIDED) {
    const outcome = readDecisionOutcome(decision.output);
    return outcome === undefined ? null : (
      <DecisionRecord
        // EditorForm holds its schema from mount; the record follows the picks, which change once the lock is lifted.
        key={`${waitKey(wait)}:${JSON.stringify(schema)}`}
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
      actions={request.actions}
      proposal={proposal}
      draft={decision.draft}
      saveDraft={(change) => saveDecisionDraft(wait, change)}
      wait={wait}
    />
  );
}

export const decisionFormRendererNew: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('DecisionFormNew')),
  renderer: withJsonFormsControlProps(DecisionFormControlNew),
};
