import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';

import diagram from '../../shared/diagram.json';

// One diagram file for both entry points: `npm run workflow` reads it from disk, the editor
// opens with it. JSON widens the icon names to `string`, hence the cast.
// A copy per call, so an edited canvas can never write back into the imported module object.
export function defaultDiagram(): { nodes: WorkflowBuilderNode[]; edges: WorkflowBuilderEdge[] } {
  const { nodes, edges } = structuredClone(diagram);
  return {
    nodes: nodes as unknown as WorkflowBuilderNode[],
    edges: edges as unknown as WorkflowBuilderEdge[],
  };
}
