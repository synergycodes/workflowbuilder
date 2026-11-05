import type {
  OptionalNodeCorner,
  OptionalNodeOverlay,
  WorkflowBuilderDecoratorWrapperProps,
} from '@workflowbuilder/sdk';
import {
  NodeRunBadge,
  NodeRunIndicator,
  NodeRunRing,
  type NodeRunStatusPreset,
  NodeRunVeil,
  runStatusPresets,
} from '@workflowbuilder/ui';

import { type NodeExecutionState, useExecutionStore } from '../../stores/use-execution-store';

type SlotProps = React.ComponentProps<typeof OptionalNodeOverlay>;
type CornerProps = React.ComponentProps<typeof OptionalNodeCorner>;

const PRESET_BY_STATUS: Record<NodeExecutionState['status'], NodeRunStatusPreset | undefined> = {
  idle: undefined,
  running: runStatusPresets.running,
  waiting: runStatusPresets.waitingForHuman,
  completed: runStatusPresets.completed,
  failed: runStatusPresets.failed,
  skipped: runStatusPresets.skipped,
};

export function nodeRunPreset(state: NodeExecutionState | undefined): NodeRunStatusPreset | undefined {
  return state && PRESET_BY_STATUS[state.status];
}

function useNodeRunPreset(nodeId: string) {
  return useExecutionStore((state) => nodeRunPreset(state.nodeStates[nodeId]));
}

export function NodeRunOverlay({ props }: { props: SlotProps }) {
  const preset = useNodeRunPreset(props.nodeId);
  if (!preset) return null;

  return (
    <>
      <NodeRunRing {...preset.ring} />
      {preset.veil && <NodeRunVeil />}
    </>
  );
}

export function NodeRunCorner({ props, children }: WorkflowBuilderDecoratorWrapperProps<CornerProps>) {
  const preset = useNodeRunPreset(props.nodeId);
  return preset ? <NodeRunBadge {...preset.badge} /> : children;
}

export function NodeRunHeaderEnd({ props }: { props: SlotProps }) {
  const indicator = useNodeRunPreset(props.nodeId)?.indicator;
  return indicator ? <NodeRunIndicator {...indicator} /> : null;
}
