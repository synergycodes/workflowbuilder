import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

import './node-overrides.css';
import '@workflowbuilder/sdk/style.css';

import logoDark from '../assets/workflow-builder-logo-white.svg';
import logoLight from '../assets/workflow-builder-logo.svg';
import { responseControlRenderer } from '../components/ai-agent/response-control';
import { AiStudioControls } from '../components/controls/ai-studio-controls';
import { DisclaimerModal } from '../components/disclaimer/disclaimer-modal';
import { ExecutionHighlighting } from '../components/execution/highlighting';
import { ExecutionLogPanel } from '../components/execution/log-panel';
import { decisionFieldsRenderer } from '../components/human-decision/decision-fields/decision-fields-control';
import { decisionFormRenderer } from '../components/human-decision/decision-form/decision-form-control';
import { DecisionWaitingSnackbar } from '../components/human-decision/waiting-snackbar/decision-waiting-snackbar';
import { OpenNotices } from '../components/open-from-url/open-notices';
import { aiStudioTemplates } from '../data/ai-studio-templates';
import { nodeTemplates } from '../data/node-templates';
import { aiStudioNodeTypes } from '../data/node-types';
import { supportTriageFlow } from '../data/support-triage-flow';
import type { OpenedSource } from './open-from-url';
import { rootPropsFor } from './root-props';

const flagship = supportTriageFlow.value;

const jsonForm = { renderers: [decisionFormRenderer, responseControlRenderer, decisionFieldsRenderer] };

// A start node is where the run begins, so it can never be a connection target.
const isValidConnection: WorkflowBuilderIsValidConnection = ({ targetNode }) => !targetNode.data.isStartNode;

export function App({ opened }: { opened: OpenedSource }) {
  const { name, initialNodes, initialEdges, integration, plugins } = rootPropsFor(opened);
  const workflowId = opened.kind === 'workflow' ? opened.workflowId : undefined;
  const isRunView = opened.kind === 'execution';

  return (
    <WorkflowBuilder.Root
      name={name}
      logo={{ light: logoLight, dark: logoDark }}
      logoHref="https://workflowbuilder.io"
      layoutDirection={flagship.layoutDirection}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      integration={integration}
      nodeTypes={aiStudioNodeTypes}
      nodeTemplates={nodeTemplates}
      jsonForm={jsonForm}
      diagramTemplates={aiStudioTemplates}
      isValidConnection={isValidConnection}
      plugins={plugins}
    >
      <WorkflowBuilder.DefaultLayout />
      <AiStudioControls workflowId={workflowId} isRunView={isRunView} />
      <ExecutionLogPanel />
      <DecisionWaitingSnackbar />
      <ExecutionHighlighting />
      <DisclaimerModal />
      <OpenNotices />
    </WorkflowBuilder.Root>
  );
}
