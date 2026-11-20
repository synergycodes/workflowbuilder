import { Spinner } from '@phosphor-icons/react';
import { Icon } from '@workflowbuilder/sdk';

import styles from './execution-node-markers.module.css';

import { setLogCollapsed, useExecutionStore } from '../../stores/use-execution-store';

type Props = { props?: { nodeId: string } };

export function ExecutionNodeMarkers({ props }: Props) {
  const nodeId = props?.nodeId ?? '';
  const nodeState = useExecutionStore((state) => state.nodeStates[nodeId]);
  if (!nodeState || nodeState.status === 'idle') return null;

  const clickable = nodeState.status === 'completed' || nodeState.status === 'failed' || nodeState.status === 'skipped';
  const icon = (() => {
    switch (nodeState.status) {
      case 'waiting': {
        return <Icon name="Clock" />;
      }
      case 'running': {
        return <Spinner />;
      }
      case 'completed': {
        return <Icon name="CheckCircle" />;
      }
      case 'failed': {
        return <Icon name="WarningDiamond" />;
      }
      case 'skipped': {
        return <Icon name="SkipForward" />;
      }
      default: {
        return null;
      }
    }
  })();

  return (
    <button
      type="button"
      disabled={!clickable}
      className={`${styles['marker']} ${styles[`marker--${nodeState.status}`]}`}
      onClick={() => setLogCollapsed(false)}
      aria-label={`Node ${nodeState.status}`}
      title={`Execution: ${nodeState.status}`}
    >
      {icon}
    </button>
  );
}
