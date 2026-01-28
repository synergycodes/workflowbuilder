import { DiagramDataModificationState } from '@/store/slices/diagram-data-modification/diagram-data-modification-slice';
import { DiagramSelectionState } from '@/store/slices/diagram-selection/diagram-selection-slice';
import { DiagramState } from '@/store/slices/diagram-slice';
import { PaletteState } from '@/store/slices/palette/palette-slice';

export function diagramStateSelector({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onInit,
  isReadOnlyMode,
  onEdgeMouseEnter,
  onEdgeMouseLeave,
  onSelectionChange,
}: DiagramState & PaletteState & DiagramDataModificationState & DiagramSelectionState) {
  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onInit,
    isReadOnlyMode,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onSelectionChange,
  };
}
