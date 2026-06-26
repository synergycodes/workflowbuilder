import { SnackbarType } from '@synergycodes/overflow-ui';
import type { OnConnect, OnConnectEnd, OnConnectStart } from '@xyflow/react';
import { useCallback } from 'react';

import { trackFutureChange } from '../../../features/changes-tracker/stores/use-changes-tracker-store';
import { useStore } from '../../../store/store';
import { showSnackbar } from '../../../utils/show-snackbar';

export function useConnect() {
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);
  const onConnectAction = useStore((store) => store.onConnect);
  const setConnectionBeingDragged = useStore((store) => store.setConnectionBeingDragged);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (isReadOnlyMode) {
        showSnackbar({
          title: 'cantEditReadOnlyMode',
          variant: SnackbarType.WARNING,
        });

        return;
      }

      trackFutureChange('addEdge');
      onConnectAction(connection);
    },
    [isReadOnlyMode, onConnectAction],
  );

  const onConnectStart: OnConnectStart = useCallback(
    (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _: any,
      { nodeId, handleId }: { nodeId: string | null; handleId: string | null },
    ) => {
      if (isReadOnlyMode) {
        return;
      }

      setConnectionBeingDragged(nodeId, handleId);
    },
    [isReadOnlyMode, setConnectionBeingDragged],
  );

  const onConnectEnd: OnConnectEnd = useCallback(() => {
    if (isReadOnlyMode) {
      return;
    }

    setConnectionBeingDragged(null, null);
  }, [isReadOnlyMode, setConnectionBeingDragged]);

  return {
    onConnect,
    onConnectStart,
    onConnectEnd,
  };
}
