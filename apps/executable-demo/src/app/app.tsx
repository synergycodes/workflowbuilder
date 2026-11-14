import {
  WorkflowBuilder,
  type WorkflowBuilderIsValidConnection,
  type WorkflowBuilderNodeTemplates,
} from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

import { ConditionalNodeTemplate, DecisionNodeTemplate } from '../components/branch-nodes/branch-node-templates';
import { ExecutionControls } from '../components/controls/execution-controls';
import { ExecutionHighlighting } from '../components/execution/execution-highlighting';
import { ExecutionLogPanel } from '../components/execution/execution-log-panel';
import { MultiPortNodeTemplate } from '../components/multi-port-node/multi-port-node-template';
import { executableNodeTypes } from '../data/nodes';
import { allNodeTemplate, executableTemplates } from '../data/templates';
import { plugin as executionUiPlugin } from '../plugin';
import { validateExecutableTemplates } from '../utils/template-validation';

validateExecutableTemplates(executableTemplates);

const initial = allNodeTemplate.value;

const nodeTemplates = {
  conditional: ConditionalNodeTemplate,
  decision: DecisionNodeTemplate,
  'multi-port': MultiPortNodeTemplate,
} satisfies WorkflowBuilderNodeTemplates;

const isValidConnection: WorkflowBuilderIsValidConnection = ({ targetNode }) => !targetNode.data.isStartNode;

export function App() {
  return (
    <WorkflowBuilder.Root
      name={initial.name}
      layoutDirection={initial.layoutDirection}
      initialNodes={initial.diagram.nodes}
      initialEdges={initial.diagram.edges}
      nodeTypes={executableNodeTypes}
      nodeTemplates={nodeTemplates}
      diagramTemplates={executableTemplates}
      isValidConnection={isValidConnection}
      plugins={[executionUiPlugin]}
    >
      <WorkflowBuilder.DefaultLayout />
      <ExecutionControls />
      <ExecutionLogPanel />
      <ExecutionHighlighting />
    </WorkflowBuilder.Root>
  );
}
