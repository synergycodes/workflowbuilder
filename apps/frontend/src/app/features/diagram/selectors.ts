import { PaletteState } from '@/store/slices/palette/palette-slice';
import { DiagramDataModificationState } from '@/store/slices/diagram-data-modification/diagram-data-modification-slice';
import { DiagramState } from '@/store/slices/diagram-slice';
import { DiagramSelectionState } from '@/store/slices/diagram-selection/diagram-selection-slice';

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
