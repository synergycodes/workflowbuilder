import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

import './node-overrides.css';
import '@workflowbuilder/sdk/style.css';

import logoDark from '../assets/workflow-builder-logo-white.svg';
import logoLight from '../assets/workflow-builder-logo.svg';
import { AiStudioControls } from '../components/controls/ai-studio-controls';
import { DisclaimerModal } from '../components/disclaimer/disclaimer-modal';
import { ExecutionHighlighting } from '../components/execution/highlighting';
import { ExecutionLogPanel } from '../components/execution/log-panel';
import { aiStudioTemplates } from '../data/ai-studio-templates';
import { aiStudioNodeTypes } from '../data/node-types';
import { supportTriageFlow } from '../data/support-triage-flow';
import { plugin as aiStudioFeaturesPlugin } from '../plugin';
import { plugin as undoRedoPlugin } from '../plugins/undo-redo/plugin-exports';

const flagship = supportTriageFlow.value;

// A start node is where the run begins, so it can never be a connection target.
const isValidConnection: WorkflowBuilderIsValidConnection = ({ targetNode }) => !targetNode.data.isStartNode;

export function App() {
  return (
    <WorkflowBuilder.Root
      name={flagship.name}
      logo={{ light: logoLight, dark: logoDark }}
      logoHref="https://workflowbuilder.io"
      layoutDirection={flagship.layoutDirection}
      initialNodes={flagship.diagram.nodes}
      initialEdges={flagship.diagram.edges}
      nodeTypes={aiStudioNodeTypes}
      diagramTemplates={aiStudioTemplates}
      isValidConnection={isValidConnection}
      plugins={[aiStudioFeaturesPlugin, undoRedoPlugin]}
    >
      <WorkflowBuilder.DefaultLayout />
      <AiStudioControls />
      <ExecutionLogPanel />
      <ExecutionHighlighting />
      <DisclaimerModal />
    </WorkflowBuilder.Root>
  );
}
