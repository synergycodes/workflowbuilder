import { useStore } from '@workflowbuilder/sdk';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';
import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { useExecutionStore } from '../stores/use-execution-store';

type EdgeLike = { source: string; target: string };

type PendingDecision = {
  isWaiting: boolean;
  executionId: string | undefined;
  /** How many times the node has parked in this run: the wait a decision addresses. */
  attempt: number;
  /** The output of the proposal source: what the person judges. */
  proposal: unknown;
};

export function attemptOf(events: ExecutionEvent[], nodeId: string): number {
  return events.filter((event) => event.type === 'node_waiting' && event.nodeId === nodeId).length;
}

// The same rule the backend applies at execute: the declared source, else the single direct predecessor.
export function proposalSourceIdOf(request: DecisionRequest, edges: EdgeLike[], nodeId: string): string | undefined {
  const declared = request.proposalSourceNodeId;
  if (typeof declared === 'string' && declared.length > 0) {
    return declared;
  }
  const sources = new Set(edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source));
  return sources.size === 1 ? [...sources][0] : undefined;
}

export function usePendingDecision(nodeId: string | undefined, request: DecisionRequest | undefined): PendingDecision {
  const isWaiting = useExecutionStore(
    (state) => nodeId !== undefined && state.nodeStates[nodeId]?.status === 'waiting',
  );
  const executionId = useExecutionStore((state) => state.executionId);
  const attempt = useExecutionStore((state) => (nodeId === undefined ? 0 : attemptOf(state.events, nodeId)));
  const edges = useStore((state) => state.edges);
  const sourceId =
    nodeId === undefined || request === undefined ? undefined : proposalSourceIdOf(request, edges, nodeId);
  const proposal = useExecutionStore((state) =>
    sourceId === undefined ? undefined : state.nodeStates[sourceId]?.output,
  );

  return { isWaiting, executionId, attempt, proposal };
}
