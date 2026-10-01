import { CheckCircleIcon, type Icon, SkipForwardIcon, SpinnerGapIcon, XCircleIcon } from '@phosphor-icons/react';

import { type NodeRunStatus, useRunStore } from './run-store';

// Mounted in the SDK's OptionalNodeContent slot, once per node. `props` are the slot's own
// props; the slot passes the node id so a decorator can scope itself to one node.
type Props = { props?: { nodeId: string } };

const ICONS: Record<NodeRunStatus, Icon> = {
  running: SpinnerGapIcon,
  completed: CheckCircleIcon,
  failed: XCircleIcon,
  skipped: SkipForwardIcon,
};

export function NodeRunMarker({ props }: Props) {
  const status = useRunStore((state) => (props ? state.nodeStatuses[props.nodeId] : undefined));
  if (!status) return null;

  const StatusIcon = ICONS[status];
  return (
    <span className={`run-marker run-marker--${status}`} title={`Temporal: ${status}`}>
      <StatusIcon size={12} weight="bold" />
    </span>
  );
}
