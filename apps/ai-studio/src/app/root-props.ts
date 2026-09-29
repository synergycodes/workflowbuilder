import type {
  OnSaveExternal,
  WorkflowBuilderEdge,
  WorkflowBuilderIntegration,
  WorkflowBuilderNode,
  WorkflowBuilderPlugin,
} from '@workflowbuilder/sdk';

import { supportTriageFlow } from '../data/support-triage-flow';
import { plugin as aiStudioFeaturesPlugin } from '../plugin';
import { plugin as openFromUrlPlugin } from '../plugins/open-from-url/plugin';
import { plugin as undoRedoPlugin } from '../plugins/undo-redo/plugin-exports';
import type { OpenedSource } from '../utils/open-from-url/resolve-diagram-source';

const flagship = supportTriageFlow.value;

export const neverSaves: OnSaveExternal = () =>
  Promise.reject(new Error('A diagram opened from a link is saved by AI Studio, not by the editor'));

// Module-level: the run lock re-applies itself whenever the editor's save callback changes identity.
const PROPS_INTEGRATION: WorkflowBuilderIntegration = { strategy: 'props', onDataSave: neverSaves };
const LOCAL_PLUGINS: WorkflowBuilderPlugin[] = [aiStudioFeaturesPlugin, undoRedoPlugin];
const URL_MODE_PLUGINS: WorkflowBuilderPlugin[] = [...LOCAL_PLUGINS, openFromUrlPlugin];

type RootProps = {
  name: string;
  initialNodes: WorkflowBuilderNode[];
  initialEdges: WorkflowBuilderEdge[];
  integration?: WorkflowBuilderIntegration;
  plugins: WorkflowBuilderPlugin[];
};

export function rootPropsFor(opened: OpenedSource): RootProps {
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
        integration: PROPS_INTEGRATION,
        plugins: URL_MODE_PLUGINS,
      };
    }
    case 'execution': {
      return {
        name: `Run ${opened.executionId.slice(0, 8)}`,
        initialNodes: opened.diagram.nodes,
        initialEdges: opened.diagram.edges,
        integration: PROPS_INTEGRATION,
        plugins: URL_MODE_PLUGINS,
      };
    }
  }
}
