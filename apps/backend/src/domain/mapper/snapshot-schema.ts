// Validates the workflow snapshot at the HTTP boundary structurally only:
// every node has `id` and `data.type`; every edge has `id`, `source`, `target`.
// `data.properties` is opaque here except for the reserved `decision` key, which
// marks a gate and is validated as a contract. The backend does not know any
// product's node vocabulary; per-type validation belongs to whichever worker
// registers executors for it, and an unknown node type surfaces at runtime as
// a `node_failed` event with the missing-executor message.
import { z } from 'zod';

import { decisionContractSchema } from '../decision/decision-contract-schema';
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
    properties: z.looseObject({ decision: decisionContractSchema.optional() }).optional(),
  }),
});

const frontendEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
});

function describeUnresolvedSource(reason: UnresolvedSourceReason, explicit?: string) {
  switch (reason) {
    case 'explicit_source_not_a_predecessor': {
      return `proposalSourceNodeId '${explicit}' is not a direct predecessor of this node`;
    }
    case 'no_predecessor': {
      return 'a rerun-source action needs a proposal source, but this node has no predecessor';
    }
    case 'ambiguous_predecessor': {
      return 'a rerun-source action needs one proposal source; several predecessors exist, set proposalSourceNodeId';
    }
    case 'not_a_gate': {
      return 'this node carries no decision contract';
    }
  }
}

export const workflowSnapshotSchema = z
  .object({
    nodes: z.array(frontendNodeSchema),
    edges: z.array(frontendEdgeSchema),
  })
  .superRefine((snapshot, context) => {
    const nodes = snapshot.nodes.map((node) => ({ id: node.id, decision: node.data.properties?.decision }));
    const edges = snapshot.edges.map((edge) => ({ sourceNodeId: edge.source, targetNodeId: edge.target }));

    for (const [index, node] of snapshot.nodes.entries()) {
      const decision = node.data.properties?.decision;
      if (decision === undefined) continue;
      const declaresRerun = decision.actions.some((action) => action.effect === 'rerun-source');
      if (decision.proposalSourceNodeId === undefined && !declaresRerun) continue;

      const path = ['nodes', index, 'data', 'properties', 'decision', 'proposalSourceNodeId'];
      const resolution = resolveProposalSource(nodes, edges, node.id);
      if (resolution.error !== undefined) {
        context.addIssue({
          code: 'custom',
          message: describeUnresolvedSource(resolution.error, decision.proposalSourceNodeId),
          path,
        });
        continue;
      }
      const sourceIsGate = nodes.some((other) => other.id === resolution.sourceNodeId && other.decision !== undefined);
      if (declaresRerun && sourceIsGate) {
        context.addIssue({
          code: 'custom',
          message: `proposal source '${resolution.sourceNodeId}' is itself a gate and cannot be re-run`,
          path,
        });
      }
    }
  });

export type WorkflowSnapshot = z.infer<typeof workflowSnapshotSchema>;
