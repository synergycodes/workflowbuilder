import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

import { defaultDiagram } from './diagram';
import { executionPlugin } from './execution/plugin';
import { nodeTypes } from './nodes';
import { resetPlugin } from './reset/plugin';

// The start node begins the workflow, so nothing can connect into it.
const isValidConnection: WorkflowBuilderIsValidConnection = ({ targetNode }) => !targetNode.data.isStartNode;

// Plugin initializers run once on first mount.
const plugins = [executionPlugin, resetPlugin];

const { nodes: initialNodes, edges: initialEdges } = defaultDiagram();

export function App() {
  return (
    <WorkflowBuilder.Root
      name="Temporal sample"
      nodeTypes={nodeTypes}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      isValidConnection={isValidConnection}
      plugins={plugins}
    />
  );
}
