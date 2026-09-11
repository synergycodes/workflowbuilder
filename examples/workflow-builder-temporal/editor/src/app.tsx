import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

import { initialEdges, initialNodes } from './diagram';
import { executionPlugin } from './execution/plugin';
import { nodeTypes } from './nodes';

// A trigger starts the workflow, so nothing can connect into it.
const isValidConnection: WorkflowBuilderIsValidConnection = ({ targetNode }) => targetNode.data.type !== 'trigger';

// Plugin initializers run once on first mount; the array must be a stable reference.
const plugins = [executionPlugin];

export function App() {
  return (
    <WorkflowBuilder.Root
      name="Workflow Builder on Temporal"
      nodeTypes={nodeTypes}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      isValidConnection={isValidConnection}
      plugins={plugins}
    />
  );
}
