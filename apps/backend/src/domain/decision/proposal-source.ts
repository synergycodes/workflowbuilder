import { unique } from 'remeda';

import type { BaseNode, WorkflowEdgeDefinition } from '@workflow-builder/types/workflow-execution/execution-model';

type GraphNode = Pick<BaseNode, 'id' | 'decision'>;
type GraphEdge = Pick<WorkflowEdgeDefinition, 'sourceNodeId' | 'targetNodeId'>;

export type UnresolvedSourceReason =
  | 'not_a_gate'
  | 'explicit_source_not_a_predecessor'
  | 'no_predecessor'
  | 'ambiguous_predecessor';

// `error?: undefined` on the success member lets a caller narrow with a plain
// `if (resolution.error !== undefined)` while both-set and neither-set stay unrepresentable.
export type ProposalSourceResolution =
  | { sourceNodeId: string; error?: undefined }
  | { sourceNodeId?: undefined; error: UnresolvedSourceReason };

// Takes the execution-model shape so a caller holding a WorkflowDefinition passes its
// nodes and edges straight in; the snapshot schema adapts before calling.
export function resolveProposalSource(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  gateId: string,
): ProposalSourceResolution {
  const gate = nodes.find((node) => node.id === gateId);
  if (gate?.decision === undefined) return { error: 'not_a_gate' };

  const predecessors = unique(edges.filter((edge) => edge.targetNodeId === gateId).map((edge) => edge.sourceNodeId));
  const explicit = gate.decision.proposalSourceNodeId;
  if (explicit !== undefined) {
    return predecessors.includes(explicit)
      ? { sourceNodeId: explicit }
      : { error: 'explicit_source_not_a_predecessor' };
  }
  if (predecessors.length === 0) return { error: 'no_predecessor' };
  if (predecessors.length > 1) return { error: 'ambiguous_predecessor' };
  return { sourceNodeId: predecessors[0] };
}
