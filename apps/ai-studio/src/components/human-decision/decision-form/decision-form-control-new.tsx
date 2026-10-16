import { rankWith, uiTypeIs, useSingleSelectedElement, withJsonFormsControlProps } from '@workflowbuilder/sdk';
import type { JsonFormsRendererExtension, NodeData, NodeDataProperties } from '@workflowbuilder/sdk';
import { useMemo } from 'react';

import { getNodeByIdAction } from '../../../../../../packages/sdk/src/store-get-actions/stores/use-store-get-actions';
import { DECISION_PHASE, type DecisionField } from '../../../hooks/node-decision/types';
import { useNodeDecisionNew } from '../../../hooks/use-node-decision-new';
import type { HumanDecisionSchema } from '../../../nodes/human-decision/schema';
import { getVariableValueAction } from '../../../stores/actions/get-variable-value';
import { useExecutionStore } from '../../../stores/use-execution-store';
import { readDecisionOutcome } from '../../../utils/human-decision/decision-outcome';
import { DecisionForm } from './decision-form';
import { DecisionRecord } from './decision-record';

// import { DecisionFormNew } from './decision-form-new';

function DecisionFormControlNew() {
  // const { data, handleChange, path, enabled, uischema } = props;
  const selection = useSingleSelectedElement();
  const nodeId = selection?.node?.id;

  const nodeState = useExecutionStore((state) => (nodeId === undefined ? undefined : state.nodeStates[nodeId]));

  const editableFields: DecisionField[] = useMemo(() => {
    const node = getNodeByIdAction(nodeId);

    console.log('dd', node);

    const editableFields =
      (node?.data as NodeData<NodeDataProperties<HumanDecisionSchema>>)?.properties?.editableFields || [];

    const fieldWithValues = editableFields.map((field) => ({
      ...field,
      value: getVariableValueAction(field.reference),
    }));

    return fieldWithValues;
  }, [nodeId, nodeState]);

  const decision = useNodeDecisionNew(nodeId, editableFields);

  if (decision.phase === DECISION_PHASE.WAITING) {
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
      actions={actions}
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
