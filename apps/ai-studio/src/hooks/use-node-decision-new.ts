import type { JsonSchema } from '@workflowbuilder/sdk';
import { useMemo } from 'react';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { getVariableValue } from '../stores/actions/get-variable-value';
import { type DecisionDraft, type DecisionWait, useExecutionStore, waitKey } from '../stores/use-execution-store';
import { DECISION_PHASE, type DecisionFieldPick } from './node-decision/types';
import { getFieldsSchema } from './node-decision/utils/get-fields-schema';
import { getFieldsValues } from './node-decision/utils/get-fields-values';

type DecisionRun = {
  wait: DecisionWait;
  schema: JsonSchema;
  /** The picked values as the run produced them: where the fields start, and what the edits are measured against. */
  proposal: Record<string, unknown>;
};

/** Where a decision node stands in the current run: nothing to show, waiting for a person, or decided. */
export type NodeDecisionNew =
  | { phase: typeof DECISION_PHASE.NONE }
  | ({ phase: typeof DECISION_PHASE.WAITING; draft: DecisionDraft | undefined } & DecisionRun)
  | ({ phase: typeof DECISION_PHASE.DECIDED; output: unknown } & DecisionRun);

export function attemptOf(events: ExecutionEvent[], nodeId: string): number {
  return events.filter((event) => event.type === 'node_waiting' && event.nodeId === nodeId).length;
}

export function useNodeDecisionNew(nodeId: string | undefined, picks: DecisionFieldPick[]): NodeDecisionNew {
  const nodeState = useExecutionStore((state) => (nodeId === undefined ? undefined : state.nodeStates[nodeId]));
  const nodeStates = useExecutionStore((state) => state.nodeStates);
  const executionId = useExecutionStore((state) => state.executionId);
  const attempt = useExecutionStore((state) => (nodeId === undefined ? 0 : attemptOf(state.events, nodeId)));
  const wait = executionId === undefined || nodeId === undefined ? undefined : { executionId, nodeId, attempt };
  const draft = useExecutionStore((state) => (wait === undefined ? undefined : state.decisionDrafts[waitKey(wait)]));

  const form = useMemo(() => {
    const fields = picks.map((pick) => ({ ...pick, value: getVariableValue(nodeStates, pick.reference) }));
    return { schema: getFieldsSchema(fields), proposal: getFieldsValues(fields) };
  }, [picks, nodeStates]);

  // A node that never parked in this run has no decision to show.
  if (nodeState === undefined || wait === undefined || attempt < 1) {
    return { phase: DECISION_PHASE.NONE };
  }
  const run = { wait, ...form };
  if (nodeState.status === 'waiting') {
    return { phase: DECISION_PHASE.WAITING, draft, ...run };
  }
  if (nodeState.status === 'completed') {
    return { phase: DECISION_PHASE.DECIDED, output: nodeState.output, ...run };
  }
  return { phase: DECISION_PHASE.NONE };
}
