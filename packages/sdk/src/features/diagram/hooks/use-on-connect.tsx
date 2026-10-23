import { SnackbarType } from '@workflowbuilder/ui';
import type { OnConnect, OnConnectEnd, OnConnectStart } from '@xyflow/react';
import { useCallback } from 'react';

import { trackFutureChange } from '../../../features/changes-tracker/stores/use-changes-tracker-store';
import { useStore } from '../../../store/store';
import { showTranslatedSnackbar } from '../../../utils/show-translated-snackbar';

export function useConnect() {
  const isReadOnly = useStore((store) => store.isReadOnly);
  const onConnectAction = useStore((store) => store.onConnect);
  const setConnectionBeingDragged = useStore((store) => store.setConnectionBeingDragged);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (isReadOnly) {
        showTranslatedSnackbar({
          title: 'cantEditReadOnlyMode',
          variant: SnackbarType.WARNING,
        });

        return;
      }

      trackFutureChange('addEdge');
      onConnectAction(connection);
    },
    [isReadOnly, onConnectAction],
  );

  const onConnectStart: OnConnectStart = useCallback(
    (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _: any,
      { nodeId, handleId }: { nodeId: string | null; handleId: string | null },
    ) => {
      if (isReadOnly) {
        return;
      }

      setConnectionBeingDragged(nodeId, handleId);
    },
    [isReadOnly, setConnectionBeingDragged],
  );

  const onConnectEnd: OnConnectEnd = useCallback(() => {
    if (isReadOnly) {
      return;
    }

    setConnectionBeingDragged(null, null);
  }, [isReadOnly, setConnectionBeingDragged]);

  return {
    onConnect,
    onConnectStart,
    onConnectEnd,
  };
}
