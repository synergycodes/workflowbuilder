import { WorkflowBuilder } from '@workflowbuilder/sdk';

import './brand-override.css';
import './node-overrides.css';
import '@workflowbuilder/sdk/style.css';

import { BrandLogo } from '../components/brand/brand-logo';
import { AiStudioControls } from '../components/controls/ai-studio-controls';
import { DisclaimerModal } from '../components/disclaimer/disclaimer-modal';
import { ExecutionHighlighting } from '../components/execution/highlighting';
import { ExecutionLogPanel } from '../components/execution/log-panel';
import { aiStudioTemplates } from '../data/ai-studio-templates';
import { aiStudioNodeTypes } from '../data/node-types';
import { supportTriageFlow } from '../data/support-triage-flow';
import { plugin as aiStudioFeaturesPlugin } from '../plugin';
import { plugin as undoRedoPlugin } from '../plugins/undo-redo/plugin-exports';

// Non-empty initialNodes/Edges make the SDK skip the welcome picker; a returning visitor's saved diagram still wins.
const flagship = supportTriageFlow.value;

export function App() {
  return (
    <WorkflowBuilder.Root
      name={flagship.name}
      layoutDirection={flagship.layoutDirection}
      initialNodes={flagship.diagram.nodes}
      initialEdges={flagship.diagram.edges}
      nodeTypes={aiStudioNodeTypes}
      diagramTemplates={aiStudioTemplates}
      plugins={[aiStudioFeaturesPlugin, undoRedoPlugin]}
    >
      <WorkflowBuilder.DefaultLayout />
      <BrandLogo />
      <AiStudioControls />
      <ExecutionLogPanel />
      <ExecutionHighlighting />
      <DisclaimerModal />
    </WorkflowBuilder.Root>
  );
}
