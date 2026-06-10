import { WorkflowBuilder } from '@workflowbuilder/sdk';
import type { WorkflowBuilderEdgeTemplates, WorkflowBuilderNodeTemplates } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

import { DashedEdge } from './components/dashed-edge/dashed-edge';
import { MultiPortNodeTemplate } from './components/multi-port-node/multi-port-node-template';
import { demoPaletteItems } from './data/palette';
import { demoTemplates } from './data/templates';
import { plugin as demoPlugin } from './plugins/__demo/plugin-exports';
import { plugin as analyticsPlugin } from './plugins/analytics/plugin-exports';
import { plugin as avoidNodesEdgesPlugin } from './plugins/avoid-nodes-edges/plugin-exports';
import { plugin as copyPastePlugin } from './plugins/copy-paste/plugin-exports';
import { plugin as downloadPdfPlugin } from './plugins/download-pdf/plugin-exports';
import { plugin as elkLayoutPlugin } from './plugins/elk-layout/plugin-exports';
import { plugin as flowRunnerPlugin } from './plugins/flow-runner/plugin-exports';
import { plugin as helpPlugin } from './plugins/help/plugin-exports';
import { plugin as reshapableEdgesPlugin } from './plugins/reshapable-edges/plugin-exports';
import { plugin as undoRedoPlugin } from './plugins/undo-redo/plugin-exports';
import { plugin as validationPlugin } from './plugins/validation/plugin-exports';
import { plugin as widgetsPlugin } from './plugins/widgets/plugin-exports';

// Declared at module scope so the references stay stable across renders, as
// `<WorkflowBuilder.Root>` requires for nodeTemplates / edgeTemplates.
const nodeTemplates = {
  'multi-port': MultiPortNodeTemplate,
} satisfies WorkflowBuilderNodeTemplates;

const edgeTemplates = {
  dashed: DashedEdge,
} satisfies WorkflowBuilderEdgeTemplates;

export function App() {
  return (
    <WorkflowBuilder.Root
      name="demo"
      nodeTypes={demoPaletteItems}
      nodeTemplates={nodeTemplates}
      edgeTemplates={edgeTemplates}
      diagramTemplates={demoTemplates}
      plugins={[
        demoPlugin,
        analyticsPlugin,
        validationPlugin,
        avoidNodesEdgesPlugin,
        copyPastePlugin,
        downloadPdfPlugin,
        elkLayoutPlugin,
        reshapableEdgesPlugin,
        undoRedoPlugin,
        widgetsPlugin,
        flowRunnerPlugin,
        helpPlugin,
      ]}
    />
  );
}
