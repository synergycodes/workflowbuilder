import type { EdgePathProps, WorkflowBuilderDecoratorWrapperProps } from '@workflowbuilder/sdk';
import type { EdgeLineType, EdgeRunState } from '@workflowbuilder/ui';
import { useStore } from '@xyflow/react';

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

// Every skip means "not executed", whatever its reason, so a skipped end never reads as travelled.
export function edgeRunState(
  source: NodeExecutionState | undefined,
  target: NodeExecutionState | undefined,
  run: RunStatus,
): EdgeRunState | undefined {
  if (run === 'idle') return undefined;
  if (target?.status === 'running') return 'running';
  if (source?.status === 'skipped' || target?.status === 'skipped') return 'outOfRun';
  if (source?.status === 'completed' && target && REACHED_TARGET_STATUSES.has(target.status)) return 'completed';
  if (!isRunAlive(run)) return 'outOfRun';
  return 'pending';
}

function useEdgeLineType(sourceId: string): EdgeLineType {
  const isDashed = useStore((state) => DASHED_SOURCE_TYPES.has(state.nodeLookup.get(sourceId)?.data.type));
  return isDashed ? 'dashed' : 'solid';
}

export function EdgeRunPath({ props, component: Path, children }: WorkflowBuilderDecoratorWrapperProps<EdgePathProps>) {
  const runState = useExecutionStore((state) =>
    edgeRunState(state.nodeStates[props.source], state.nodeStates[props.target], state.status),
  );
  const sourceLineType = useEdgeLineType(props.source);
  const lineType = props.lineType ?? sourceLineType;
  if (!runState && lineType === (props.lineType ?? 'solid')) return children;

  return <Path {...props} runState={runState} lineType={lineType} />;
}
