import { closeSnackbar, showSnackbar, useStore } from '@workflowbuilder/sdk';
import { useEffect, useRef, useState } from 'react';

import { attemptOf } from '../../../hooks/use-node-decision';
import { useSelectNode } from '../../../hooks/use-select-node';
import { useExecutionStore, waitKey } from '../../../stores/use-execution-store';

/** Tells the person the run waits for them until the wait ends or they close it; it steps aside while they are at a waiting node. */
export function DecisionWaitingSnackbar() {
  const executionId = useExecutionStore((state) => state.executionId);
  const nodeStates = useExecutionStore((state) => state.nodeStates);
  const events = useExecutionStore((state) => state.events);
  const waitingIds = Object.keys(nodeStates)
    .filter((nodeId) => nodeStates[nodeId]?.status === 'waiting')
    .sort();
  const label = useStore((state) => state.nodes.find((node) => node.id === waitingIds[0])?.data.properties.label);
  const isAtWaitingNode = useStore((state) => state.selectedNodesIds.some((nodeId) => waitingIds.includes(nodeId)));
  const selectNode = useSelectNode();
  // Closing hides these waits only: another node parking, or this one parking again, shows it anew.
  const [closedKey, setClosedKey] = useState<string>();
  const showCount = useRef(0);

  const waitsKey =
    executionId === undefined
      ? ''
      : waitingIds.map((nodeId) => waitKey({ executionId, nodeId, attempt: attemptOf(events, nodeId) })).join(' ');
  const isShown = waitsKey !== '' && waitsKey !== closedKey && !isAtWaitingNode;
  const onlyWaitingId = waitingIds.length === 1 ? waitingIds[0] : undefined;
  const waitingCount = waitingIds.length;

  useEffect(() => {
    if (!isShown) {
      return;
    }
    // Its own key per show: notistack still counts a closing snackbar as on screen and drops a show under its key.
    const key = `decision-waiting:${waitsKey}:${++showCount.current}`;
    const lasting = { key, variant: 'info', autoHideDuration: null, onClose: () => setClosedKey(waitsKey) } as const;
    showSnackbar(
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
