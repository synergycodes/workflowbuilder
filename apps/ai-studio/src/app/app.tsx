import { WorkflowBuilder } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

import { AiStudioControls } from '../components/controls/ai-studio-controls';
import { ExecutionHighlighting } from '../components/execution/highlighting';
import { ExecutionLogPanel } from '../components/execution/log-panel';
import { ExecutionNodeDetail } from '../components/execution/node-detail';
import { aiStudioTemplates } from '../data/ai-studio-templates';
import { aiStudioNodeTypes } from '../data/node-types';
import { plugin as aiStudioFeaturesPlugin } from '../plugin';

export function App() {
  return (
    <WorkflowBuilder.Root
      name="ai-studio"
      nodeTypes={aiStudioNodeTypes}
      templates={aiStudioTemplates}
      plugins={[aiStudioFeaturesPlugin]}
    >
      <WorkflowBuilder.DefaultLayout />
      <AiStudioControls />
      <ExecutionLogPanel />
      <ExecutionNodeDetail />
      <ExecutionHighlighting />
    </WorkflowBuilder.Root>
  );
}
