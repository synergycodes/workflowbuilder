import { type OptionalNodeOverlay, type WorkflowBuilderDecoratorWrapperProps } from '@workflowbuilder/sdk';
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

const PRESET_BY_STATUS: Record<NodeExecutionState['status'], NodeRunStatusPreset | undefined> = {
  idle: undefined,
  running: runStatusPresets.running,
  waiting: runStatusPresets.waitingForHuman,
  completed: runStatusPresets.completed,
  failed: runStatusPresets.failed,
  skipped: runStatusPresets.skipped,
};

function useNodeRunPreset(nodeId: string) {
  return useExecutionStore((state) => {
    const nodeState = state.nodeStates[nodeId];
    return nodeState && PRESET_BY_STATUS[nodeState.status];
  });
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

function useWaitingSince(nodeId: string) {
  return useExecutionStore((state) => {
    if (state.nodeStates[nodeId]?.status !== 'waiting') return;
    for (let index = state.events.length - 1; index >= 0; index--) {
      const event = state.events[index];
      if (event?.type === 'node_waiting' && event.nodeId === nodeId) return event.timestamp;
    }
  });
}

const formatTime = (isoTimestamp: string) =>
  new Date(isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function NodeRunCorner({ props, children }: WorkflowBuilderDecoratorWrapperProps<SlotProps>) {
  const preset = useNodeRunPreset(props.nodeId);
  const waitingSince = useWaitingSince(props.nodeId);
  if (!preset) return children;

  const label = waitingSince ? `${preset.badge.label} · since ${formatTime(waitingSince)}` : preset.badge.label;
  return <NodeRunBadge {...preset.badge} label={label} />;
}

export function NodeRunHeaderEnd({ props }: { props: SlotProps }) {
  const indicator = useNodeRunPreset(props.nodeId)?.indicator;
  return indicator ? <NodeRunIndicator {...indicator} /> : null;
}
