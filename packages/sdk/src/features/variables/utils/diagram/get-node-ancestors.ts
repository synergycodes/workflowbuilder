import type { WorkflowBuilderEdge } from '../../../../node/node-data';

type AncestorConnection = {
  source: string;
  sourceHandle?: string | undefined;
};

export function getNodeAncestors(nodeId: string, edges: WorkflowBuilderEdge[]): AncestorConnection[] {
  const ancestors = new Map<string, AncestorConnection>();

  const queue = [nodeId];

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    for (const edge of edges) {
      if (edge.target === currentNodeId) {
        const key = `${edge.source}:${edge.sourceHandle ?? ''}`;

        if (!ancestors.has(key)) {
          ancestors.set(key, {
            source: edge.source,
            sourceHandle: edge.sourceHandle ?? undefined,
          });

          queue.push(edge.source);
        }
      }
    }
  }

  return [...ancestors.values()];
}
