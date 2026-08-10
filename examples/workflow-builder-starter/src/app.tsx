import { WorkflowBuilder } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

import { initialEdges, initialNodes } from './diagram/initial-diagram';
import { nodeTypes } from './nodes';

export function App() {
  return (
    <WorkflowBuilder.Root
      name="Workflow Builder Starter"
      nodeTypes={nodeTypes}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
    />
  );
}
