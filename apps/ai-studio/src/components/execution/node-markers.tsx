import { Spinner } from '@phosphor-icons/react';
import { Icon } from '@workflowbuilder/sdk';

import styles from './node-markers.module.css';

import { setLogCollapsed, useExecutionStore } from '../../stores/use-execution-store';

type Props = {
  props?: {
    nodeId: string;
  };
};

export function ExecutionNodeMarkers({ props }: Props) {
  const nodeId = props?.nodeId ?? '';
  const nodeState = useExecutionStore((s) => s.nodeStates[nodeId]);

  if (!nodeState || nodeState.status === 'idle') return null;

  const isClickable = nodeState.status === 'completed' || nodeState.status === 'failed';

  // The click also selects the node on the canvas, which drives the log highlight.
  return (
    <div
      className={`${styles['container']} ${isClickable ? styles['container--clickable'] : ''}`}
      onClick={isClickable ? () => setLogCollapsed(false) : undefined}
    >
      {nodeState.status === 'running' && (
        <span className={`${styles['icon']} ${styles['icon--running']}`}>
          <Spinner />
        </span>
      )}
      {nodeState.status === 'completed' && (
        <span className={`${styles['icon']} ${styles['icon--completed']}`}>
          <Icon name="FlagBannerFold" />
        </span>
      )}
      {nodeState.status === 'failed' && (
        <span className={`${styles['icon']} ${styles['icon--failed']}`}>
          <Icon name="WarningDiamond" />
        </span>
      )}
    </div>
  );
}
