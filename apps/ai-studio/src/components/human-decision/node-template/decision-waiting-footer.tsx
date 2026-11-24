import { useSetSelection } from '@workflowbuilder/sdk';
import { Button, NodeFooter, runStatusPresets } from '@workflowbuilder/ui';

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

  if (!isAwaitingDecision) {
    return null;
  }

  const decide = () => {
    if (setSelection({ nodeIds: [nodeId] })) {
      requestDecisionFocus(nodeId);
    }
  };

  return (
    <NodeFooter {...runStatusPresets.waitingForHuman.footer}>
      <Button
        className="nodrag"
        variant="ghost-secondary"
        size="xs"
        aria-label={hasText(nodeLabel) ? `Decide: ${nodeLabel}` : undefined}
        onClick={decide}
      >
        Decide
      </Button>
    </NodeFooter>
  );
}
