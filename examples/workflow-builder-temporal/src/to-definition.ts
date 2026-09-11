import type { WorkflowDefinition, WorkflowEdgeDefinition } from '@workflowbuilder/temporal';

import { SAMPLE_NODE_TYPES, type SampleNode, isSampleNodeType } from './nodes';
import type { DiagramSnapshot, SnapshotEdge, SnapshotNode } from './protocol';

// The editor's snapshot is React Flow data; the plugin wants `{ id, type, config }` per node
// and `{ sourceNodeId, targetNodeId }` per edge. This is the only glue in the sample.
export function snapshotToDefinition(snapshot: DiagramSnapshot, workflowId: string): WorkflowDefinition<SampleNode> {
  // Newer editors stamp `isStartNode` on the entry node. The 2.3.0 editor this sample ships
  // does not, so the trigger type stands in when no node carries the flag.
  const flagged = snapshot.nodes.some((node) => node.data.isStartNode === true);
  const isStart = (node: SnapshotNode) => (flagged ? node.data.isStartNode === true : node.data.type === 'trigger');

  const nodes = snapshot.nodes.map((node) => toNode(node, isStart(node)));
  if (!nodes.some((node) => node.role === 'start')) {
    throw new Error('The diagram has no start node. Add a trigger node, or flag one node with isStartNode.');
  }

  return { workflowId, nodes, edges: snapshot.edges.map(toEdge) };
}

function toNode(node: SnapshotNode, isStart: boolean): SampleNode {
  const { type } = node.data;
  if (!isSampleNodeType(type)) {
    throw new Error(`Unknown node type "${type}". This worker has executors for: ${SAMPLE_NODE_TYPES.join(', ')}.`);
  }

  const { label, ...config } = node.data.properties ?? {};
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
    // The editor names its default output handle "source". The runner consults handles only
    // when a node names a port, so for these nodes the handle is carried, never read.
    ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
  };
}
