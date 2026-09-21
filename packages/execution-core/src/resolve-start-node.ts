import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

// Errors carry a message rather than a code: they name the offending node ids, and
// nothing downstream branches on them — the runner turns whichever arrives into the
// same terminal failure.
type StartNodeResolution<TNode extends BaseNode> = { startNode: TNode } | { error: string };

// Validates the graph's entry shape and returns the one node the run begins at.
//
// Every runnable workflow has exactly one start node, declared by the author rather
// than inferred from the graph. Inferring roots from in-degree cannot tell an
// intentional trigger from a node whose only incoming edge was deleted: the orphan
// runs in the first wave with no upstream output, and that output still flows
// downstream. Requiring the declaration turns each of those shapes into a named error
// before any node runs.
export function resolveStartNode<TNode extends BaseNode>(
  nodes: TNode[],
  inDegree: Map<string, number>,
): StartNodeResolution<TNode> {
  const startNodes = nodes.filter((node) => node.role === 'start');

  if (startNodes.length === 0) {
    return { error: 'Workflow has no start node: exactly one node must be marked as the start node' };
  }
  if (startNodes.length > 1) {
    const ids = startNodes.map((node) => node.id).join(', ');
    return { error: `Workflow has ${startNodes.length} start nodes, but exactly one is allowed: ${ids}` };
  }

  const startNode = startNodes[0]!;

  // An edge back into the start node would leave it waiting on a predecessor it is
  // supposed to precede. Caught here rather than left to the stall check, which would
  // report it as a cycle several waves later.
  if ((inDegree.get(startNode.id) ?? 0) > 0) {
    return { error: `Start node "${startNode.id}" has incoming edges: the start node must have none` };
  }

  // Anything else sitting at in-degree 0 is unreachable, since the run begins at the
  // start node alone.
  const orphans = nodes.filter((node) => node.id !== startNode.id && (inDegree.get(node.id) ?? 0) === 0);
  if (orphans.length > 0) {
    const ids = orphans.map((node) => node.id).join(', ');
    return { error: `Workflow has orphaned nodes (no incoming edge and not a start node): ${ids}` };
  }

  return { startNode };
}
