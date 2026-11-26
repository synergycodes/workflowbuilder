import type { DiagramModel } from '../node/common';
import { useStore } from '../store/store';
import { snapDiagramToGrid } from '../utils/position-utils';
import { fitDiagramView } from './use-fit-view';

export function loadDiagramModel(model?: DiagramModel) {
  const { setDiagramModel } = useStore.getState();
  setDiagramModel(model && snapDiagramToGrid(model));
  fitDiagramView(useStore.getState().reactFlowInstance);
}
