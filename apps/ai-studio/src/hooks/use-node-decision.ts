import { useStore } from '@workflowbuilder/sdk';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { type DecisionDraft, type DecisionWait, useExecutionStore, waitKey } from '../stores/use-execution-store';

type EdgeLike = { source: string; target: string };

type DecisionRun = {
  wait: DecisionWait;
  /** The output of the proposal source: what the person judges. */
  proposal: unknown;
};

/** Where a decision node stands in the current run: nothing to show, waiting for a person, or decided. */
type NodeDecision =
  | { phase: 'none' }
  | ({ phase: 'waiting'; draft: DecisionDraft | undefined } & DecisionRun)
  | ({ phase: 'decided'; output: unknown } & DecisionRun);

export function attemptOf(events: ExecutionEvent[], nodeId: string): number {
  return events.filter((event) => event.type === 'node_waiting' && event.nodeId === nodeId).length;
}

// The rule the backend applies at execute, on the same graph: the canvas is read-only while it shows a run.
export function proposalSourceIdOf(
  declared: string | undefined,
  edges: EdgeLike[],
  nodeId: string,
): string | undefined {
  if (declared !== undefined) {
    return declared;
  }
  const incoming = edges.filter((edge) => edge.target === nodeId && edge.source !== nodeId);
  const sources = new Set(incoming.map((edge) => edge.source));
  return sources.size === 1 ? [...sources][0] : undefined;
}

export function useNodeDecision(nodeId: string | undefined, proposalSourceNodeId: string | undefined): NodeDecision {
  const nodeState = useExecutionStore((state) => (nodeId === undefined ? undefined : state.nodeStates[nodeId]));
  const executionId = useExecutionStore((state) => state.executionId);
  const attempt = useExecutionStore((state) => (nodeId === undefined ? 0 : attemptOf(state.events, nodeId)));
  const edges = useStore((state) => state.edges);
  const sourceId = nodeId === undefined ? undefined : proposalSourceIdOf(proposalSourceNodeId, edges, nodeId);
  const proposal = useExecutionStore((state) =>
    sourceId === undefined ? undefined : state.nodeStates[sourceId]?.output,
  );
  const wait = executionId === undefined || nodeId === undefined ? undefined : { executionId, nodeId, attempt };
  const draft = useExecutionStore((state) => (wait === undefined ? undefined : state.decisionDrafts[waitKey(wait)]));

  // A node that never parked in this run has no decision to show.
  if (nodeState === undefined || wait === undefined || attempt < 1) {
    return { phase: 'none' };
  }
  const run = { wait, proposal };
  if (nodeState.status === 'waiting') {
    return { phase: 'waiting', draft, ...run };
  }
  if (nodeState.status === 'completed') {
    return { phase: 'decided', output: nodeState.output, ...run };
  }
  return { phase: 'none' };
}
