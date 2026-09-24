import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

import './node-overrides.css';
import '@workflowbuilder/sdk/style.css';

import logoDark from '../assets/workflow-builder-logo-white.svg';
import logoLight from '../assets/workflow-builder-logo.svg';
import { AiStudioControls } from '../components/controls/ai-studio-controls';
import { DisclaimerModal } from '../components/disclaimer/disclaimer-modal';
import { ExecutionHighlighting } from '../components/execution/highlighting';
import { ExecutionLogPanel } from '../components/execution/log-panel';
import { decisionFormRenderer } from '../components/human-decision/decision-form/decision-form-control';
import { HumanDecisionNodeTemplate } from '../components/human-decision/node-template/human-decision-template';
import { aiStudioTemplates } from '../data/ai-studio-templates';
import { aiStudioNodeTypes } from '../data/node-types';
import { supportTriageFlow } from '../data/support-triage-flow';
import { humanDecisionNodeType } from '../nodes/human-decision';
import { plugin as aiStudioFeaturesPlugin } from '../plugin';
import { plugin as undoRedoPlugin } from '../plugins/undo-redo/plugin-exports';

const flagship = supportTriageFlow.value;

// Module-level: `nodeTemplates` must keep the same reference across renders.
const nodeTemplates = { [humanDecisionNodeType]: HumanDecisionNodeTemplate };
const jsonForm = { renderers: [decisionFormRenderer] };

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
      nodeTemplates={nodeTemplates}
      jsonForm={jsonForm}
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
