import { Icon } from '@workflowbuilder/sdk';
import { Button } from '@workflowbuilder/ui';

import styles from './human-decision-template.module.css';

import { useSelectNode } from '../../../hooks/use-select-node';
import { useExecutionStore } from '../../../stores/use-execution-store';

type Props = {
  nodeId: string;
};

/** Says on the node that the run waits for this decision, and leads the person to it. */
export function DecisionWaitingFooter({ nodeId }: Props) {
  const isWaiting = useExecutionStore((state) => state.nodeStates[nodeId]?.status === 'waiting');
  const selectNode = useSelectNode();

  if (!isWaiting) {
    return null;
  }

  return (
    <div className={styles['waiting']}>
      <span className={styles['waiting-label']}>
        <Icon name="Clock" />
        Waiting for decision
      </span>
      {/* Selecting the node is what opens the decision form in the properties panel. */}
      <Button variant="ghost-primary" size="xs" onClick={() => selectNode(nodeId)}>
        Decide
      </Button>
    </div>
  );
}
