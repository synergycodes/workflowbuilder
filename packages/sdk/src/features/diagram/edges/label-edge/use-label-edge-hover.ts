import { type EdgeState, useEdgeStyle } from '@workflowbuilder/ui';
import { useState } from 'react';

import { useStore } from '../../../../store/store';

type UseLabelEdgeHoverParams = {
  id: string;
  isSelected?: boolean;
};

/**
 * Tracks hover state for a single edge across both its line and its label
 * (which live in different React subtrees) and returns the resolved style
 * + handlers a custom edge component should bind.
 *
 * Suppresses hover while another edge is mid-segment-drag so the visual
 * doesn't flicker. Reach for it when authoring a custom edge type that
 * wants the same hover feel as the built-in {@link LabelEdge}.
 *
 * @category Hooks
 */
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
