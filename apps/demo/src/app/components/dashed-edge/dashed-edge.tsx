import { EnhancedBaseEdge, useLabelEdgeHover } from '@workflowbuilder/sdk';
import { type EdgeProps, getSmoothStepPath } from '@xyflow/react';

/**
 * Demo custom edge. Registered on `<WorkflowBuilder.Root edgeTemplates>` under
 * the `'dashed'` key, so any edge with `type: 'dashed'` renders dashed instead
 * of the built-in `labelEdge`.
 *
 * Mirrors the `multi-port` node-template example: a consumer component that
 * takes ReactFlow's `EdgeProps` directly (no SDK adapter) and reuses the
 * exported `EnhancedBaseEdge` for a wide hit target. Selection and hover are
 * delegated to the SDK's `useLabelEdgeHover` so this edge highlights exactly
 * like the built-in one — it just keeps a dashed stroke on top.
 */
export function DashedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const { style } = useLabelEdgeHover({ id, isSelected: selected });
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return <EnhancedBaseEdge id={id} path={path} style={{ ...style, strokeDasharray: '6 4' }} />;
}
