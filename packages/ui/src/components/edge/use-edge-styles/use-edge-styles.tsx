import { useMemo } from 'react';

import './use-edge-styles.css';

import { EdgeState } from '../types';

export type UseEdgeStyleParams = {
  /**
   * The visual state of the edge. Determines base styles like `strokeWidth`.
   */
  state?: EdgeState;

  /**
   * Whether the edge is currently hovered.
   * When true, applies hover color on top of the state styles.
   */
  isHovered?: boolean;
};

/**
 * A custom hook for computing CSS style properties for diagram edges based on their visual state and hover interaction.
 *
 * The `useEdgeStyle` hook returns an object of CSS properties (such as `stroke`, `strokeWidth`, and `transition`)
 * that can be directly applied to an SVG path element representing an edge.
 */
export function useEdgeStyle({ state = 'default', isHovered = false }: UseEdgeStyleParams) {
  return useMemo(() => {
    const strokeCssVariable =
      state === 'disabled'
        ? '--wb-public-edge-color-disabled'
        : state === 'selected' || state === 'temporary'
          ? '--wb-public-edge-color-select'
          : isHovered
            ? '--wb-public-edge-color-hover'
            : '--wb-public-edge-color';

    const strokeWidthCssVariable =
      state === 'selected' ? '--wb-public-edge-stroke-width-select' : '--wb-public-edge-stroke-width';

    const transition = isHovered ? 'none' : `stroke var(--wb-public-transition)`;

    return {
      stroke: `var(${strokeCssVariable})`,
      strokeWidth: `var(${strokeWidthCssVariable})`,
      transition,
    };
  }, [state, isHovered]);
}
