import type { EdgePathProps, WorkflowBuilderDecoratorWrapperProps } from '@workflowbuilder/sdk';
import type { EdgeLineType, EdgeRunState } from '@workflowbuilder/ui';
import { useStore } from '@xyflow/react';

import { RESERVED_ERROR_HANDLE, isPortRouted } from '@workflow-builder/types/workflow-execution/edge-routing';

import { decisionPaletteItem } from '../../nodes/decision';
import {
  type NodeExecutionState,
  type RunStatus,
  isRunAlive,
  useExecutionStore,
} from '../../stores/use-execution-store';

const REACHED_TARGET_STATUSES: ReadonlySet<NodeExecutionState['status']> = new Set(['completed', 'waiting', 'failed']);

// Human tasks (human decision, review) stay solid: only branching nodes draw dashed edges.
const DASHED_SOURCE_TYPES: ReadonlySet<unknown> = new Set([decisionPaletteItem.type]);

// undefined until the source has finished.
function isEdgeTaken(
  source: NodeExecutionState | undefined,
  sourceHandle: string | null | undefined,
): boolean | undefined {
  if (source?.status !== 'completed' && source?.status !== 'failed') return;
  // Runs recorded before `nextPort` was emitted carry none, even for a routed failure.
  if (source.status === 'failed' && !source.nextPort && sourceHandle === RESERVED_ERROR_HANDLE) return true;
  return isPortRouted(source.nextPort, sourceHandle);
}

// Every skip means "not executed", whatever its reason, so a skipped end never reads as travelled.
// A target reached through another edge does not make this one travelled: only the source's port does.
export function edgeRunState(
  source: NodeExecutionState | undefined,
  target: NodeExecutionState | undefined,
  run: RunStatus,
  sourceHandle?: string | null,
): EdgeRunState | undefined {
  if (run === 'idle') return undefined;
  if (source?.status === 'skipped' || target?.status === 'skipped') return 'outOfRun';
  const taken = isEdgeTaken(source, sourceHandle);
  if (taken === false) return 'outOfRun';
  if (taken && target?.status === 'running') return 'running';
  if (taken && target && REACHED_TARGET_STATUSES.has(target.status)) return 'completed';
  if (!isRunAlive(run)) return 'outOfRun';
  return 'pending';
}

function useEdgeLineType(sourceId: string): EdgeLineType {
  const isDashed = useStore((state) => DASHED_SOURCE_TYPES.has(state.nodeLookup.get(sourceId)?.data.type));
  return isDashed ? 'dashed' : 'solid';
}

export function EdgeRunPath({ props, component: Path, children }: WorkflowBuilderDecoratorWrapperProps<EdgePathProps>) {
  const runState = useExecutionStore((state) =>
    edgeRunState(state.nodeStates[props.source], state.nodeStates[props.target], state.status, props.sourceHandle),
  );
  const sourceLineType = useEdgeLineType(props.source);
  const lineType = props.lineType ?? sourceLineType;
  if (!runState && lineType === (props.lineType ?? 'solid')) return children;

  return <Path {...props} runState={runState} lineType={lineType} />;
}
