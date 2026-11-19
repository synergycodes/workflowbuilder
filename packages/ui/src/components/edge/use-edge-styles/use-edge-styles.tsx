import { useMemo } from 'react';

import './use-edge-styles.css';

import { EdgeLineType, EdgeRunState, EdgeState } from '../types';

export type UseEdgeStyleParams = {
  /**
   * The visual state of the edge. `disabled` wins the colour over every other input.
   * @default 'default'
   */
  state?: EdgeState;

  /**
   * Whether the edge is currently hovered.
   * When true, applies the hover color unless the edge is selected, temporary, disabled or has a `runState`.
   * @default false
   */
  isHovered?: boolean;

  /**
   * Where the edge stands in an execution run. When set, hover and selection no longer change the color;
   * `running` draws an animated dash.
   */
  runState?: EdgeRunState;

  /**
   * Line pattern when the edge is not running. `running` always uses its own dash.
   * @default 'solid'
   */
  lineType?: EdgeLineType;
};

/**
 * Style returned by {@link useEdgeStyle}, ready to spread on an SVG path's `style`.
 *
 * @category Edge
 */
export type EdgeStyle = {
  stroke: string;
  strokeWidth: string;
  transition: string;
  strokeDasharray?: string;
  animation?: string;
};

const RUN_STATE_COLOR: Record<EdgeRunState, string> = {
  pending: '--wb-public-edge-color-pending',
  running: '--wb-public-edge-color-running',
  completed: '--wb-public-edge-color-completed',
  outOfRun: '--wb-public-edge-color-out-of-run',
};

/**
 * A custom hook for computing CSS style properties for diagram edges based on their visual state,
 * hover interaction, run state and line type.
 *
 * The `useEdgeStyle` hook returns an object of CSS properties (`stroke`, `strokeWidth`, `transition`, and
 * `strokeDasharray` / `animation` when the line is dashed or running) that can be directly applied to an SVG path
 * element representing an edge.
 */
export function useEdgeStyle({
  state = 'default',
  isHovered = false,
  runState,
  lineType = 'solid',
}: UseEdgeStyleParams): EdgeStyle {
  return useMemo(() => {
    const strokeCssVariable =
      state === 'disabled'
        ? '--wb-public-edge-color-disabled'
        : runState
          ? RUN_STATE_COLOR[runState]
          : state === 'selected' || state === 'temporary'
            ? '--wb-public-edge-color-select'
            : isHovered
              ? '--wb-public-edge-color-hover'
              : '--wb-public-edge-color';

    const style: EdgeStyle = {
      stroke: `var(${strokeCssVariable})`,
      strokeWidth: 'var(--wb-public-edge-stroke-width)',
      transition: isHovered && !runState ? 'none' : 'stroke var(--wb-public-transition)',
    };

    if (runState === 'running') {
      style.strokeDasharray = 'var(--wb-public-edge-dash-running)';
      style.animation = 'var(--wb-public-edge-animation-running)';
    } else if (lineType === 'dashed') {
      style.strokeDasharray = 'var(--wb-public-edge-dash-dashed)';
    }

    return style;
  }, [state, isHovered, runState, lineType]);
}
