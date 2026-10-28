import { closeSnackbar, showSnackbar, useSetSelection, useStore } from '@workflowbuilder/sdk';
import { useEffect, useState } from 'react';

import { attemptOf } from '../../../hooks/use-node-decision';
import { isDecidable, requestDecisionFocus, useExecutionStore, waitKey } from '../../../stores/use-execution-store';

/** Tells the person the run waits for them until the wait ends or they close it; it steps aside while a waiting node alone is selected. */
export function DecisionWaitingSnackbar() {
  const executionId = useExecutionStore((state) => state.executionId);
  const isRunDecidable = useExecutionStore((state) => isDecidable(state.status));
  const nodeStates = useExecutionStore((state) => state.nodeStates);
  const events = useExecutionStore((state) => state.events);
  const waitingIds = Object.keys(nodeStates)
    .filter((nodeId) => nodeStates[nodeId]?.status === 'waiting')
    .sort();
  const onlyWaitingId = waitingIds.length === 1 ? waitingIds[0] : undefined;
  // Read for a single wait only: the count the snackbar shows for several does not change with a node's label.
  const label = useStore((state) => state.nodes.find((node) => node.id === onlyWaitingId)?.data.properties.label);
  const isOnlyWaitingNodeOnCanvas = useStore((state) => state.nodes.some((node) => node.id === onlyWaitingId));
  // The properties panel shows the decision form for a single selection only.
  const selectedNodeId = useStore((state) =>
    state.selectedNodesIds.length === 1 && state.selectedEdgesIds.length === 0 ? state.selectedNodesIds[0] : undefined,
  );
  const setSelection = useSetSelection();
  // Closing hides the waits it showed: another node parking, or one parking again, shows it anew, and so does a reload.
  const [dismissedWaits, setDismissedWaits] = useState<ReadonlySet<string>>(() => new Set());

  const waitKeys =
    executionId === undefined
      ? []
      : waitingIds.map((nodeId) => waitKey({ executionId, nodeId, attempt: attemptOf(events, nodeId) }));
  // One string for the effect's dependencies; JSON, since a node id may hold any character.
  const waitKeysJson = JSON.stringify(waitKeys);
  const isWaitingNodeSelected = selectedNodeId !== undefined && waitingIds.includes(selectedNodeId);
  const isShown = isRunDecidable && waitKeys.some((key) => !dismissedWaits.has(key)) && !isWaitingNodeSelected;
  const waitingCount = waitingIds.length;

  useEffect(() => {
    if (!isShown) {
      return;
    }
    const shownWaits: string[] = JSON.parse(waitKeysJson);
    const sharedOptions = {
      variant: 'info',
      autoHideDuration: null,
      onClose: () => setDismissedWaits((dismissed) => new Set([...dismissed, ...shownWaits])),
    } as const;
    const decide = (nodeId: string) => {
      if (setSelection({ nodeIds: [nodeId] })) {
        requestDecisionFocus(nodeId);
      }
    };
    const key = showSnackbar(
      // One button cannot know which of the nodes the person wants.
      onlyWaitingId === undefined
        ? {
            ...sharedOptions,
            title: `${waitingCount} decisions are waiting`,
            subtitle: 'Select a waiting node to decide.',
          }
        : {
            ...sharedOptions,
            title: 'Waiting for decision',
            subtitle: label,
            // A node the canvas lacks, such as after an import during the run, cannot be selected.
            ...(isOnlyWaitingNodeOnCanvas && { buttonLabel: 'Decide', onButtonClick: () => decide(onlyWaitingId) }),
          },
    );
    return () => closeSnackbar(key);
  }, [isShown, waitKeysJson, onlyWaitingId, waitingCount, label, isOnlyWaitingNodeOnCanvas, setSelection]);

  return null;
}
