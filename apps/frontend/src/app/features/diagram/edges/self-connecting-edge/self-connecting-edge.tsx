import { BaseEdge, EdgeProps } from '@xyflow/react';
import { EdgeState, useEdgeStyle } from '@synergycodes/overflow-ui';
import { EDGE_CURVE_RADIUS, SELF_CONNECTING_EDGE_LABEL_OFFSET } from '../edge.consts';
import { WorkflowBuilderEdge } from '@workflow-builder/types/node-data';

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

  return <BaseEdge id={id} path={path} style={style} />;
}
