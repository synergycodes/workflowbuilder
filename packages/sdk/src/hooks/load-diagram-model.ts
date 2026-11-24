import { snapDiagramToGrid } from '../data/templates';
import type { DiagramModel } from '../node/common';
import { useStore } from '../store/store';
import { fitDiagramView } from './use-fit-view';

// Snaps as `setCustomTemplates` does, so any caller gets the canvas the template selector gives.
export function loadDiagramModel(model?: DiagramModel) {
  useStore.getState().setDiagramModel(model && snapDiagramToGrid(model));
  fitDiagramView(useStore.getState().reactFlowInstance);
}
