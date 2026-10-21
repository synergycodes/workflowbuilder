import type { WorkflowDefinition, WorkflowEdgeDefinition } from '@workflowbuilder/temporal';

import type { DiagramSnapshot, SnapshotEdge, SnapshotNode } from '../../shared/protocol';
import { SAMPLE_NODE_TYPES, type SampleNode, isSampleNodeType } from './nodes';

// The editor's snapshot is React Flow data; the plugin wants `{ id, type, config }` per node
// and `{ sourceNodeId, targetNodeId }` per edge. This is the only glue in the sample.
export function snapshotToDefinition(snapshot: DiagramSnapshot, workflowId: string): WorkflowDefinition<SampleNode> {
  const nodes = snapshot.nodes.map((node) => toNode(node, node.data.isStartNode === true));
  const startNodes = nodes.filter((node) => node.role === 'start');
  if (startNodes.length === 0) {
    throw new Error('The diagram has no start node. Add a trigger node from the palette.');
  }
  if (startNodes.length > 1) {
    const ids = startNodes.map((node) => node.id).join(', ');
    throw new Error(`The diagram has ${startNodes.length} start nodes, but exactly one is allowed: ${ids}.`);
  }

  return { workflowId, nodes, edges: snapshot.edges.map(toEdge) };
}

function toNode(node: SnapshotNode, isStart: boolean): SampleNode {
  const { type } = node.data;
  if (!isSampleNodeType(type)) {
    throw new Error(`Unknown node type "${type}". This worker has executors for: ${SAMPLE_NODE_TYPES.join(', ')}.`);
  }

  const { label, ...config } = node.data.properties ?? {};
  // The editor's validation state, not node configuration.
  delete config.errors;
  return {
    id: node.id,
    type,
    config,
    ...(typeof label === 'string' && label.trim() !== '' ? { label: label.trim() } : {}),
    ...(isStart ? { role: 'start' as const } : {}),
  } as SampleNode;
}

function toEdge(edge: SnapshotEdge): WorkflowEdgeDefinition {
  return {
    id: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    // The runner fires an edge only when its handle equals the port the source named. The
    // decision node names a branch handle; the others name none, so their "source" is never read.
    ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
  };
}
