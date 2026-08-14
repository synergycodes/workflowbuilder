import { useCallback, useEffect, useRef } from 'react';

import { useChangesTrackerStore } from '../../changes-tracker/stores/use-changes-tracker-store';
import { refreshAllSuggestions, refreshNodesIdsSuggestions } from '../stores/core/refresh-suggestions';

type Refresh = {
  type: 'partial' | 'global';
  nodesIds: Set<string>;
};

const REFRESH_ALL_VARIABLES_DELAY_MS = 100;
const REFRESH_PART_VARIABLES_DELAY_MS = 100;

function useRefreshVariables() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<Refresh>({
    type: 'partial',
    nodesIds: new Set(),
  });
  const lastChangeName = useChangesTrackerStore((store) => store.lastChangeName);
  const lastChangeParams = useChangesTrackerStore((store) => store.lastChangeParams);

  const refreshAll = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      refreshAllSuggestions();
      refreshRef.current = {
        type: 'partial',
        nodesIds: new Set<string>(),
      };
    }, REFRESH_ALL_VARIABLES_DELAY_MS);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const wasNodeUpdated = ['dataUpdateNode', 'addNode'].includes(lastChangeName);
    const wasDiagramReloaded = ['undo', 'redo', 'import'].includes(lastChangeName);

    const shouldRefreshVariables = wasNodeUpdated || wasDiagramReloaded;
    if (!shouldRefreshVariables) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (wasNodeUpdated) {
      const nodeId = (lastChangeParams as unknown as { id?: string })?.id || '';
      if (nodeId) {
        refreshRef.current.nodesIds.add(nodeId);
      } else {
        console.warn('Expected nodeId from the event to refresh variables, but it was not received.');
        // Force global refresh
        refreshRef.current.type = 'global';
      }
    }

    if (wasDiagramReloaded) {
      refreshRef.current.type = 'global';
    }

    if (refreshRef.current.type === 'global') {
      timeoutRef.current = setTimeout(refreshAll, REFRESH_ALL_VARIABLES_DELAY_MS);

      return;
    }

    timeoutRef.current = setTimeout(() => {
      refreshNodesIdsSuggestions([...refreshRef.current.nodesIds]);

      refreshRef.current = {
        type: 'partial',
        nodesIds: new Set<string>(),
      };
    }, REFRESH_PART_VARIABLES_DELAY_MS);
  }, [lastChangeName, lastChangeParams, refreshAll]);
}

export default useRefreshVariables;
