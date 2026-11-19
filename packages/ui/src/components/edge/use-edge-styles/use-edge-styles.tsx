import { useMemo } from 'react';

import './use-edge-styles.css';

import { DEFAULT_EDGE_RUN_TONE, resolveEdgeRunTone } from '../resolve-edge-run-tone/resolve-edge-run-tone';
import { EdgeLineType, EdgeRunState, EdgeRunToneName, EdgeState } from '../types';

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
   * Colour of the edge under `runState`, replacing the default tone of that run state. Ignored without `runState`.
   * A custom name reads `--wb-public-edge-run-status-stroke-<name>` and falls back to the run state's tone.
   */
  tone?: EdgeRunToneName;

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

// The content of `var()`: a custom tone falls back to the run state's tone when its variable is missing.
function runStrokeVariable(runState: EdgeRunState, tone: EdgeRunToneName | undefined) {
  const defaultTone = DEFAULT_EDGE_RUN_TONE[runState];
  const resolved = resolveEdgeRunTone(runState, tone);
  const variable = `--wb-public-edge-run-status-stroke-${defaultTone}`;

  return resolved === defaultTone ? variable : `--wb-public-edge-run-status-stroke-${resolved}, var(${variable})`;
}

/**
 * A custom hook for computing CSS style properties for diagram edges based on their visual state,
 * hover interaction, run state, run tone and line type.
 *
 * The `useEdgeStyle` hook returns an object of CSS properties (`stroke`, `strokeWidth`, `transition`, and
 * `strokeDasharray` / `animation` when the line is dashed or running) that can be directly applied to an SVG path
 * element representing an edge.
 */
export function useEdgeStyle({
  state = 'default',
  isHovered = false,
  runState,
  tone,
  lineType = 'solid',
}: UseEdgeStyleParams): EdgeStyle {
  return useMemo(() => {
    const strokeCssVariable =
      state === 'disabled'
        ? '--wb-public-edge-color-disabled'
        : runState
          ? runStrokeVariable(runState, tone)
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
  }, [state, isHovered, runState, tone, lineType]);
}
