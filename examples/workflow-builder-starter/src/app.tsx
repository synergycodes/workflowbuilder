import { WorkflowBuilder } from '@workflowbuilder/sdk';
import type { WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

import { initialEdges, initialNodes } from './diagram/initial-diagram';
import { nodeTypes } from './nodes';

// A trigger starts the workflow, so nothing can connect into it.
const isValidConnection: WorkflowBuilderIsValidConnection = ({ targetNode }) => targetNode.data.type !== 'trigger';

export function App() {
  return (
    <WorkflowBuilder.Root
      name="Workflow Builder Starter"
      nodeTypes={nodeTypes}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      isValidConnection={isValidConnection}
    />
  );
}
