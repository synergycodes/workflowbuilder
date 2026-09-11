import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';

import diagram from '../../src/diagram.json';

// One diagram file for both entry points: `npm run workflow` reads it from disk, the editor
// opens with it. JSON widens the icon names to `string`, hence the cast.
export const initialNodes = diagram.nodes as unknown as WorkflowBuilderNode[];
export const initialEdges = diagram.edges as unknown as WorkflowBuilderEdge[];
