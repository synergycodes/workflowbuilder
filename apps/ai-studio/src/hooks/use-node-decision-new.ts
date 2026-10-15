// import { attemptOf } from './use-node-decision';
import { useMemo } from 'react';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { useExecutionStore } from '../stores/use-execution-store';
import { DECISION_PHASE, type DecisionField } from './node-decision/types';
import { getFieldsSchema } from './node-decision/utils/get-fields-schema';
import { getFieldsValues } from './node-decision/utils/get-fields-values';

export function attemptOf(events: ExecutionEvent[], nodeId: string): number {
  return events.filter((event) => event.type === 'node_waiting' && event.nodeId === nodeId).length;
}

export function useNodeDecisionNew(nodeId: string | undefined, fields: DecisionField[]) {
  const nodeState = useExecutionStore((state) => (nodeId === undefined ? undefined : state.nodeStates[nodeId]));
  // const attempt = useExecutionStore((state) => (nodeId === undefined ? 0 : attemptOf(state.events, nodeId)));

  const formSetup = useMemo(
    () => ({
      schema: getFieldsSchema(fields),
      initialData: getFieldsValues(fields),
    }),
    [fields],
  );

  if (nodeState?.status === 'waiting') {
    return { phase: DECISION_PHASE.WAITING, ...formSetup };
  }

  if (nodeState?.status === 'completed') {
    return { phase: DECISION_PHASE.DECIDED, ...formSetup, output: nodeState.output };
  }

  return { phase: DECISION_PHASE.NONE, ...formSetup };
}
