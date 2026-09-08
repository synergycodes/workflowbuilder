// Validates the workflow snapshot at the HTTP boundary structurally only:
// every node has `id` and `data.type`; every edge has `id`, `source`, `target`.
// `data.properties` is opaque here except for the reserved `decisionRequest` key,
// which is validated as a decision request. The backend does not know any
// product's node vocabulary; per-type validation belongs to whichever worker
// registers executors for it, and an unknown node type surfaces at runtime as
// a `node_failed` event with the missing-executor message.
import { z } from 'zod';

import { type DecisionIssueCode, decisionIssue } from '../decision/decision-issues';
import { decisionRequestSchema } from '../decision/decision-request-schema';
import { type UnresolvedSourceReason, resolveProposalSource } from '../decision/proposal-source';

const frontendNodeSchema = z.object({
  id: z.string(),
  data: z.object({
    type: z.string(),
    // The editor's entrypoint flag. Declared here because zod strips whatever
    // it is not told about, and the runner needs it to pick the node a run
    // starts from. The editor's node kind (`start-node`, `node`, ...) is a
    // rendering detail and deliberately not read here.
    isStartNode: z.boolean().optional(),
    properties: z.looseObject({ decisionRequest: decisionRequestSchema.optional() }).optional(),
  }),
});

const frontendEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
});

const SOURCE_ISSUE_BY_REASON = {
  node_without_decision_request: 'source_node_without_decision_request',
  explicit_source_not_a_predecessor: 'source_not_a_predecessor',
  no_predecessor: 'source_missing',
  ambiguous_predecessor: 'source_ambiguous',
} as const satisfies Record<UnresolvedSourceReason, DecisionIssueCode>;

export const workflowSnapshotSchema = z
  .object({
    nodes: z.array(frontendNodeSchema),
    edges: z.array(frontendEdgeSchema),
  })
  .superRefine((snapshot, context) => {
    const nodes = snapshot.nodes.map((node) => ({
      id: node.id,
      decisionRequest: node.data.properties?.decisionRequest,
    }));
    const edges = snapshot.edges.map((edge) => ({ sourceNodeId: edge.source, targetNodeId: edge.target }));

    for (const [index, node] of snapshot.nodes.entries()) {
      const request = node.data.properties?.decisionRequest;
      if (request === undefined) continue;
      const declaresRerun = request.actions.some((action) => action.effect === 'rerun-source');
      if (request.proposalSourceNodeId === undefined && !declaresRerun) continue;

      const path = ['nodes', index, 'data', 'properties', 'decisionRequest', 'proposalSourceNodeId'];
      const resolution = resolveProposalSource(nodes, edges, node.id);
      if (resolution.error !== undefined) {
        context.addIssue(decisionIssue(SOURCE_ISSUE_BY_REASON[resolution.error], path, request.proposalSourceNodeId));
        continue;
      }
      const sourceHasRequest = nodes.some(
        (other) => other.id === resolution.sourceNodeId && other.decisionRequest !== undefined,
      );
      if (declaresRerun && sourceHasRequest) {
        context.addIssue(decisionIssue('source_has_decision_request', path, resolution.sourceNodeId));
      }
    }
  });

export type WorkflowSnapshot = z.infer<typeof workflowSnapshotSchema>;
