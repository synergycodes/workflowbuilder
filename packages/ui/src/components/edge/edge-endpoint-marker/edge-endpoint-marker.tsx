import type { CSSProperties } from 'react';

import type { EdgeEndpoint } from '../types';

export type EdgeEndpointMarkerProps = {
  /**
   * Id the path points at: `markerEnd={`url(#${id})`}`. Unique per edge.
   */
  id: string;
  type: Exclude<EdgeEndpoint, 'none'>;
  /**
   * Style of the path this marker ends, as returned by `useEdgeStyle`. Only its colour, width and transition
   * are used, so the terminator is never dashed or animated.
   */
  style?: Pick<CSSProperties, 'stroke' | 'strokeWidth' | 'transition'>;
};

// Sizes in px from DS Links / Endpoints. The reference point is where the path ends.
const MARKER_BOX = {
  arrow: { markerWidth: 8, markerHeight: 13, refX: 6.5, refY: 6.5 },
  circle: { markerWidth: 9, markerHeight: 9, refX: 8.5, refY: 4.5 },
};

/**
 * SVG `<marker>` that draws the design-system terminator of an edge. Render one per edge, next to its path,
 * with the same `style`: the terminator then has the colour of the line in every state.
 *
 * @category Edge
 */
export function EdgeEndpointMarker({ id, type, style }: EdgeEndpointMarkerProps) {
  const shapeStyle = { stroke: style?.stroke, strokeWidth: style?.strokeWidth, transition: style?.transition };

  return (
    <marker id={id} markerUnits="userSpaceOnUse" orient="auto" {...MARKER_BOX[type]}>
      {type === 'arrow' ? (
        // polyline, not path: host and xyflow rules that target `path` (`.animated path`) must not restyle it.
        <polyline points="1,1 6.5,6.5 1,12" fill="none" style={shapeStyle} />
      ) : (
        // Filled with the canvas colour to hide the line that runs under the circle.
        <circle
          cx={4.5}
          cy={4.5}
          r={3.5}
          style={{ ...shapeStyle, fill: 'var(--wb-public-background-color, var(--wb-ds-ui-bg-canvas))' }}
        />
      )}
    </marker>
  );
}
