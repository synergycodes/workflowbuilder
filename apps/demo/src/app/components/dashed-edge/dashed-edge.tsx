import { EnhancedBaseEdge } from '@workflowbuilder/sdk';
import { type EdgeProps, getSmoothStepPath } from '@xyflow/react';

/**
 * Demo custom edge. Registered on `<WorkflowBuilder.Root edgeTemplates>` under
 * the `'dashed'` key, so any edge with `type: 'dashed'` renders with this
 * dashed accent stroke instead of the built-in `labelEdge`.
 *
 * Mirrors the `multi-port` node-template example: a consumer component that
 * takes ReactFlow's `EdgeProps` directly (no SDK adapter) and reuses the
 * exported `EnhancedBaseEdge` for a wide hit target.
 */
export function DashedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  id,
}: EdgeProps) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <EnhancedBaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{ stroke: 'var(--wb-color-accent, #6c5ce7)', strokeWidth: 2, strokeDasharray: '6 4' }}
    />
  );
}
