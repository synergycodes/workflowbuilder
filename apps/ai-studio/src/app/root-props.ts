import type {
  OnSaveExternal,
  WorkflowBuilderEdge,
  WorkflowBuilderIntegration,
  WorkflowBuilderNode,
  WorkflowBuilderPlugin,
} from '@workflowbuilder/sdk';

import { saveDraftOf } from '../adapters/save-workflow-draft';
import { supportTriageFlow } from '../data/support-triage-flow';
import { plugin as aiStudioFeaturesPlugin } from '../plugin';
import { plugin as runViewPlugin } from '../plugins/run-view/plugin';
import { plugin as undoRedoPlugin } from '../plugins/undo-redo/plugin-exports';
import type { OpenedSource } from './open-from-url';

const flagship = supportTriageFlow.value;

export const neverSaves: OnSaveExternal = () =>
  Promise.reject(new Error('A run view has no Save button, so the editor never saves it'));

// Module-level, and one props object per opened source below: the run lock re-applies itself whenever the
// editor's save callback changes identity.
const RUN_VIEW_INTEGRATION: WorkflowBuilderIntegration = { strategy: 'props', onDataSave: neverSaves };
const LOCAL_PLUGINS: WorkflowBuilderPlugin[] = [aiStudioFeaturesPlugin, undoRedoPlugin];
const RUN_VIEW_PLUGINS: WorkflowBuilderPlugin[] = [...LOCAL_PLUGINS, runViewPlugin];

type RootProps = {
  name: string;
  initialNodes: WorkflowBuilderNode[];
  initialEdges: WorkflowBuilderEdge[];
  integration?: WorkflowBuilderIntegration;
  plugins: WorkflowBuilderPlugin[];
};

const propsBySource = new WeakMap<OpenedSource, RootProps>();

export function rootPropsFor(opened: OpenedSource): RootProps {
  let props = propsBySource.get(opened);
  if (props === undefined) {
    props = buildRootProps(opened);
    propsBySource.set(opened, props);
  }
  return props;
}

function buildRootProps(opened: OpenedSource): RootProps {
  switch (opened.kind) {
    case 'local': {
      return {
        name: flagship.name,
        initialNodes: flagship.diagram.nodes,
        initialEdges: flagship.diagram.edges,
        plugins: LOCAL_PLUGINS,
      };
    }
    case 'workflow': {
      return {
        name: opened.name,
        initialNodes: opened.diagram.nodes,
        initialEdges: opened.diagram.edges,
        integration: { strategy: 'props', onDataSave: saveDraftOf(opened.workflowId) },
        plugins: LOCAL_PLUGINS,
      };
    }
    case 'execution': {
      return {
        name: `Run ${opened.executionId.slice(0, 8)}`,
        initialNodes: opened.diagram.nodes,
        initialEdges: opened.diagram.edges,
        integration: RUN_VIEW_INTEGRATION,
        plugins: RUN_VIEW_PLUGINS,
      };
    }
  }
}
