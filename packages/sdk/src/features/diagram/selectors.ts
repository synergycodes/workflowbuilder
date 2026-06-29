import type { DiagramDataModificationState } from '../../store/slices/diagram-data-modification/diagram-data-modification-slice';
import type { DiagramSelectionState } from '../../store/slices/diagram-selection/diagram-selection-slice';
import type { DiagramState } from '../../store/slices/diagram-slice';
import type { PaletteState } from '../../store/slices/palette/palette-slice';

export function diagramStateSelector({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
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
    onInit,
    isReadOnlyMode,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onSelectionChange,
  };
}
