import {
  type OptionalNodeCorner,
  type OptionalNodeOverlay,
  type WorkflowBuilderDecoratorWrapperProps,
  useStore,
} from '@workflowbuilder/sdk';
import {
  NodeRunBadge,
  NodeRunIndicator,
  NodeRunRing,
  type NodeRunStatusPreset,
  NodeRunVeil,
  runStatusPresets,
} from '@workflowbuilder/ui';
import { useLayoutEffect, useRef } from 'react';

import { type NodeExecutionState, useExecutionStore } from '../../stores/use-execution-store';
import { nodeLabel } from '../../utils/node-label';

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

// Set on the DOM: `node.ariaLabel` in the store would be saved with the workflow and enter undo history.
function NodeRunName({ nodeId, status }: { nodeId: string; status: string }) {
  const name = useStore((state) => `${nodeLabel(state, nodeId)}, ${status}`);
  const anchor = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = anchor.current?.closest('.react-flow__node');
    if (!node) return;
    const previous = node.getAttribute('aria-label');
    node.setAttribute('aria-label', name);
    return () => {
      if (previous === null) node.removeAttribute('aria-label');
      else node.setAttribute('aria-label', previous);
    };
  }, [name]);

  return <span ref={anchor} hidden />;
}

/** Draws the node's run status and puts it into the node's accessible name. */
export function NodeRunOverlay({ props }: { props: SlotProps }) {
  const preset = useNodeRunPreset(props.nodeId);
  if (!preset) return null;

  return (
    <>
      <NodeRunName nodeId={props.nodeId} status={preset.badge.label} />
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
