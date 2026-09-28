import { closeSnackbar, showSnackbar, useStore } from '@workflowbuilder/sdk';
import { useEffect, useState } from 'react';

import { attemptOf } from '../../../hooks/use-node-decision';
import { useSelectNode } from '../../../hooks/use-select-node';
import { useExecutionStore, waitKey } from '../../../stores/use-execution-store';

/** Tells the person the run waits for them until the wait ends or they close it; it steps aside while a waiting node alone is selected. */
export function DecisionWaitingSnackbar() {
  const executionId = useExecutionStore((state) => state.executionId);
  const nodeStates = useExecutionStore((state) => state.nodeStates);
  const events = useExecutionStore((state) => state.events);
  const waitingIds = Object.keys(nodeStates)
    .filter((nodeId) => nodeStates[nodeId]?.status === 'waiting')
    .sort();
  const label = useStore((state) => state.nodes.find((node) => node.id === waitingIds[0])?.data.properties.label);
  // The properties panel shows the decision form for a single selection only.
  const selectedNodeId = useStore((state) =>
    state.selectedNodesIds.length === 1 && state.selectedEdgesIds.length === 0 ? state.selectedNodesIds[0] : undefined,
  );
  const selectNode = useSelectNode();
  // Closing hides the waits it showed: another node parking, or one parking again, shows it anew.
  const [dismissedWaits, setDismissedWaits] = useState<ReadonlySet<string>>(() => new Set());

  const waitKeys =
    executionId === undefined
      ? []
      : waitingIds.map((nodeId) => waitKey({ executionId, nodeId, attempt: attemptOf(events, nodeId) }));
  const waitsKey = waitKeys.join(' ');
  const isWaitingNodeSelected = selectedNodeId !== undefined && waitingIds.includes(selectedNodeId);
  const isShown = waitKeys.some((key) => !dismissedWaits.has(key)) && !isWaitingNodeSelected;
  const onlyWaitingId = waitingIds.length === 1 ? waitingIds[0] : undefined;
  const waitingCount = waitingIds.length;

  useEffect(() => {
    if (!isShown) {
      return;
    }
    const shownWaits = waitsKey.split(' ');
    const lasting = {
      variant: 'info',
      autoHideDuration: null,
      onClose: () => setDismissedWaits((dismissed) => new Set([...dismissed, ...shownWaits])),
    } as const;
    const key = showSnackbar(
      onlyWaitingId === undefined
        ? { ...lasting, title: `${waitingCount} decisions are waiting`, subtitle: 'Select a waiting node to decide.' }
        : {
            ...lasting,
            title: 'Waiting for decision',
            subtitle: label,
            buttonLabel: 'Decide',
            onButtonClick: () => selectNode(onlyWaitingId),
          },
    );
    return () => closeSnackbar(key);
  }, [isShown, waitsKey, onlyWaitingId, waitingCount, label, selectNode]);

  return null;
}
