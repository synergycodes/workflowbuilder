import { unique } from 'remeda';

import type { BaseNode, WorkflowEdgeDefinition } from '@workflow-builder/types/workflow-execution/execution-model';

type GraphNode = Pick<BaseNode, 'id' | 'decisionRequest'>;
type GraphEdge = Pick<WorkflowEdgeDefinition, 'sourceNodeId' | 'targetNodeId'>;

export type UnresolvedSourceReason =
  | 'node_without_decision_request'
  | 'explicit_source_not_a_predecessor'
  | 'no_predecessor'
  | 'ambiguous_predecessor';

// Result shape: apps/backend/decision-request.decision-log.md, decision 9.
export type ProposalSourceResolution =
  | { sourceNodeId: string; error?: undefined }
  | { sourceNodeId?: undefined; error: UnresolvedSourceReason };

// Takes the execution-model shape so a caller holding a WorkflowDefinition passes its
// nodes and edges straight in; the snapshot schema adapts before calling.
export function resolveProposalSource(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  nodeId: string,
): ProposalSourceResolution {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (node?.decisionRequest === undefined) return { error: 'node_without_decision_request' };

  // A self-loop is not a predecessor.
  const predecessors = unique(
    edges
      .filter((edge) => edge.targetNodeId === nodeId && edge.sourceNodeId !== nodeId)
      .map((edge) => edge.sourceNodeId),
  );
  const explicit = node.decisionRequest.proposalSourceNodeId;
  if (explicit !== undefined) {
    return predecessors.includes(explicit)
      ? { sourceNodeId: explicit }
      : { error: 'explicit_source_not_a_predecessor' };
  }
  if (predecessors.length === 0) return { error: 'no_predecessor' };
  if (predecessors.length > 1) return { error: 'ambiguous_predecessor' };
  return { sourceNodeId: predecessors[0] };
}
