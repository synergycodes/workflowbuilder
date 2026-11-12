import { OptionalEdgePath, useLabelEdgeHover } from '@workflowbuilder/sdk';
import { type EdgeProps, getSmoothStepPath } from '@xyflow/react';

/**
 * Demo custom edge. Registered on `<WorkflowBuilder.Root edgeTemplates>` under
 * the `'dashed'` key, so any edge with `type: 'dashed'` renders dashed instead
 * of the built-in `labelEdge`.
 *
 * Mirrors the `multi-port` node-template example: a consumer component that
 * takes ReactFlow's `EdgeProps` directly (no SDK adapter). It draws through
 * the SDK's `OptionalEdgePath`, so it gets the built-in hit area, selection,
 * hover and focus colours, and any run state a plugin sets on that slot.
 *
 * This is a minimal styling example, not a full `labelEdge` replacement. It
 * deliberately skips two things the built-in does: the self-connecting loop
 * when `source === target` (a self-loop drawn with this type collapses to a
 * degenerate path), and rendering `data.label` / `data.icon`. If you need
 * either, branch on `source === target` and delegate to the exported
 * `SelfConnectingEdge`, and render your own label.
 */
export function DashedEdge({
  id,
  source,
  target,
  sourceHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const { hovered } = useLabelEdgeHover({ id, isSelected: selected });
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <OptionalEdgePath
      edgeId={id}
      source={source}
      target={target}
      sourceHandle={sourceHandleId}
      path={path}
      state={selected ? 'selected' : 'default'}
      hovered={hovered}
      lineType="dashed"
    />
  );
}
