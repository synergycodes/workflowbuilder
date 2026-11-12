import { Icon, useSetSelection, useWorkflowBuilderActions } from '@workflowbuilder/sdk';
import { Button } from '@workflowbuilder/ui';

import styles from './human-decision-template.module.css';

import { isDecidable, requestDecisionFocus, useExecutionStore } from '../../../stores/use-execution-store';
import { hasText } from '../../../utils/has-text';

type Props = {
  nodeId: string;
  nodeLabel: string | undefined;
};

/** Says on the node that the run waits for this decision, and leads the person to it. */
export function DecisionWaitingFooter({ nodeId, nodeLabel }: Props) {
  const isAwaitingDecision = useExecutionStore(
    (state) => state.nodeStates[nodeId]?.status === 'waiting' && isDecidable(state.status),
  );
  const setSelection = useSetSelection();
  const { setPropertiesPanelOpen } = useWorkflowBuilderActions();

  if (!isAwaitingDecision) {
    return null;
  }

  // The form lives in the properties panel, which the run start or the header toggle may have collapsed.
  const decide = () => {
    if (setSelection({ nodeIds: [nodeId] })) {
      setPropertiesPanelOpen(true);
      requestDecisionFocus(nodeId);
    }
  };

  return (
    <div className={styles['waiting']}>
      <span className={styles['waiting-label']}>
        <Icon name="Clock" />
        Waiting for decision
      </span>
      <Button
        className="nodrag"
        variant="ghost-primary"
        size="xs"
        aria-label={hasText(nodeLabel) ? `Decide: ${nodeLabel}` : undefined}
        onClick={decide}
      >
        Decide
      </Button>
    </div>
  );
}
