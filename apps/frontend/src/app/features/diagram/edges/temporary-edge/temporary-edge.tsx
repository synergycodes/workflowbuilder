import { EDGE_CURVE_RADIUS, EDGE_OFFSET } from '../edge.consts';
import { useEdgeStyle } from '@synergycodes/overflow-ui';
import { BaseEdge, ConnectionLineComponentProps, getSmoothStepPath } from '@xyflow/react';

export function TemporaryEdge({ fromX, fromY, fromPosition, toX, toY, toPosition }: ConnectionLineComponentProps) {
  const style = useEdgeStyle({ state: 'temporary' });
  const defaultPortSize = 4;

  /**
    Calculate path offset to avoid an unwanted "S" curve when a link is created.
    The smooth step algorithm adds 20px before and after the curve, which can look unnatural.
    Offset is applied only when there's enough distance from the port to ensure a smooth appearance. 

    When the distance is sufficient, the offset includes the port size because the temporary edge 
    connects to the center of the port, while the final edge connects to its edge. 
    This ensures the temporary edge follows the exact path of the final edge.
  **/
  const hasEnoughDistance = Math.abs(fromX - toX) > EDGE_OFFSET || Math.abs(fromY - toY) > EDGE_OFFSET;
  const offset = hasEnoughDistance ? EDGE_OFFSET + defaultPortSize : 0;

  const [edgePath] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: EDGE_CURVE_RADIUS,
    offset,
  });

  return <BaseEdge path={edgePath} style={style} />;
}
