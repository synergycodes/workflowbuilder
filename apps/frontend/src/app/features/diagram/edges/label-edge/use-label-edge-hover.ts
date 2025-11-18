import { useState } from 'react';
import useStore from '@/store/store';
import { EdgeState, useEdgeStyle } from '@synergycodes/overflow-ui';

type UseLabelEdgeHoverParams = {
  id: string;
  isSelected?: boolean;
};

export function useLabelEdgeHover({ id, isSelected }: UseLabelEdgeHoverParams) {
  const draggedSegmentDestinationId = useStore((state) => state.draggedSegmentDestinationId);
  const [labelHovered, setLabelHovered] = useState(false);
  const edgeHovered = useStore((state) => state.hoveredElement === id);
  const hovered = (labelHovered || edgeHovered) && !draggedSegmentDestinationId;

  const edgeState: EdgeState = isSelected ? 'selected' : 'default';
  const style = useEdgeStyle({ state: edgeState, isHovered: hovered });

  function handleMouseEnter() {
    setLabelHovered(true);
  }

  function handleMouseLeave() {
    setLabelHovered(false);
  }

  return {
    style,
    hovered,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
}
