import { useEffect, useRef } from 'react';

import type { WorkflowBuilderNode } from '../../../node/node-data';
import { useStore } from '../../../store/store';
import { refreshAllSuggestions, refreshNodesIdsSuggestions } from '../stores/core/refresh-suggestions';

const SYNC_DELAY_MS = 500;

type PendingSync = {
  timeout: ReturnType<typeof setTimeout>;
  // From the first change of a burst; later changes only push the timer back.
  previousNodesDataById: Map<string, WorkflowBuilderNode['data']>;
};

function syncSuggestions({ previousNodesDataById }: PendingSync) {
  const { nodes } = useStore.getState();
  const changedIds = nodes.filter((node) => previousNodesDataById.get(node.id) !== node.data).map((node) => node.id);

  if (changedIds.length > 0) {
    refreshNodesIdsSuggestions(changedIds);
  }
}

// A node's variables depend only on its `data` and its palette definition. Store updates replace `data`
// only when it changed (immer, and React Flow's position, select and resize changes keep it), so comparing
// references finds every edit, whichever action, plugin or setter made it.
export function useVariablesSync() {
  const pendingRef = useRef<PendingSync | null>(null);

  useEffect(() => {
    refreshAllSuggestions();

    const unsubscribe = useStore.subscribe((state, previous) => {
      if (state.nodes === previous.nodes) {
        return;
      }

      const isPending = pendingRef.current;
      if (isPending) {
        clearTimeout(isPending.timeout);
      }

      pendingRef.current = {
        previousNodesDataById: isPending
          ? isPending.previousNodesDataById
          : new Map(previous.nodes.map((node) => [node.id, node.data])),
        timeout: setTimeout(() => {
          const since = pendingRef.current;
          pendingRef.current = null;

          if (since) {
            syncSuggestions(since);
          }
        }, SYNC_DELAY_MS),
      };
    });

    return () => {
      unsubscribe();
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeout);
      }
      pendingRef.current = null;
    };
  }, []);
}
