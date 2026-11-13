import { useState } from 'react';

import { useStore } from '../../../../store/store';

type UseLabelEdgeHoverParams = {
  id: string;
  /** @deprecated Unused since the hook stopped returning `style`; pass `state` to {@link OptionalEdgePath}. */
  isSelected?: boolean;
};

/**
 * Tracks hover state for a single edge across both its line and its label
 * (which live in different React subtrees) and returns `hovered` plus the
 * handlers a custom edge's label should bind.
 *
 * Suppresses hover while another edge is mid-segment-drag so the visual
 * doesn't flicker. Reach for it when authoring a custom edge type that
 * wants the same hover feel as the built-in {@link LabelEdge}: pass `hovered`
 * to {@link OptionalEdgePath}.
 *
 * @category Hooks
 */
export function useLabelEdgeHover({ id }: UseLabelEdgeHoverParams) {
  const draggedSegmentDestinationId = useStore((state) => state.draggedSegmentDestinationId);
  const [labelHovered, setLabelHovered] = useState(false);
  const edgeHovered = useStore((state) => state.hoveredElement === id);
  const hovered = (labelHovered || edgeHovered) && !draggedSegmentDestinationId;

  function handleMouseEnter() {
    setLabelHovered(true);
  }

  function handleMouseLeave() {
    setLabelHovered(false);
  }

  return {
    hovered,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
}
