import { type EdgeState, useEdgeStyle } from '@synergycodes/overflow-ui';
import type { EdgeProps } from '@xyflow/react';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { EDGE_CURVE_RADIUS, SELF_CONNECTING_EDGE_LABEL_OFFSET } from '../edge.consts';
import { EnhancedBaseEdge } from '../enhanced-base-edge/enhanced-base-edge';

type SelfConnectingEdgeProps = EdgeProps<WorkflowBuilderEdge> & {
  nodeHeight?: number;
  hovered: boolean;
};

type Point = {
  x: number;
  y: number;
};

function createSelfConnectingPath(source: Point, target: Point, nodeHeight: number, radius: number) {
  const loopHeight = nodeHeight + SELF_CONNECTING_EDGE_LABEL_OFFSET;
  const horizontalOffset = 25;

  const points = {
    start: { x: source.x, y: source.y },
    topLeft: { x: source.x + horizontalOffset, y: source.y - loopHeight },
    topRight: { x: target.x - horizontalOffset, y: target.y },
    end: { x: target.x, y: target.y },
  };

  return `
    M ${points.start.x} ${points.start.y}
    L ${points.start.x + radius} ${points.start.y}
    Q ${points.topLeft.x} ${points.start.y} ${points.topLeft.x} ${points.start.y - radius}
    L ${points.topLeft.x} ${points.topLeft.y + radius}
    Q ${points.topLeft.x} ${points.topLeft.y} ${points.topLeft.x - radius} ${points.topLeft.y}
    L ${points.topRight.x + radius} ${points.topLeft.y}
    Q ${points.topRight.x} ${points.topLeft.y} ${points.topRight.x} ${points.topLeft.y + radius}
    L ${points.topRight.x} ${points.topRight.y - radius}
    Q ${points.topRight.x} ${points.topRight.y} ${points.topRight.x + radius} ${points.topRight.y}
    L ${points.end.x} ${points.end.y}
  `.trim();
}

/**
 * Edge that loops above the source node when source and target are the
 * same node (a "self-connecting" or "back-to-self" edge). Draws a
 * rounded-corner path that arches over the node so the loop stays visible
 * regardless of the node's size.
 *
 * Used internally by {@link LabelEdge}; expose only when you author a
 * custom edge type and want to reuse the same loop geometry.
 *
 * @category Components
 */
export function SelfConnectingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  hovered,
  nodeHeight = 0,
}: SelfConnectingEdgeProps) {
  const edgeState: EdgeState = selected ? 'selected' : 'default';
  const style = useEdgeStyle({ state: edgeState, isHovered: hovered });

  const path = createSelfConnectingPath(
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
    nodeHeight,
    EDGE_CURVE_RADIUS,
  );

  return <EnhancedBaseEdge id={id} path={path} style={style} />;
}
