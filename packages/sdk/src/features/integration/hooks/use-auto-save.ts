import { useContext, useEffect, useRef } from 'react';

import { useChangesTrackerStore } from '../../changes-tracker/stores/use-changes-tracker-store';
import { IntegrationContext } from '../components/integration-variants/context/integration-context-wrapper';
import { AUTO_SAVE_IF_CHANGED_OVER_X_SECONDS_AGO, SKIP_AUTO_SAVE_CHECK_FOR_EVENTS } from '../consts';
import { useIntegrationStore } from '../stores/use-integration-store';

/*
  If many changes happen at once, it waits for a while to save the end state.
*/
const AUTO_SAVE_DELAY_IN_MS = 400;

export function useAutoSave() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { onSave } = useContext(IntegrationContext);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    function cancelPendingAutoSave() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // Subscribe imperatively rather than with a reactive selector so the host
    // (the Save button) does not re-render on every tracked change. During a
    // node drag `trackFutureChange('nodeDragChange')` fires once per frame; a
    // reactive subscription re-rendered the button on every tick (WB-221).
    const unsubscribeChanges = useChangesTrackerStore.subscribe((state) => {
      // For example nodeDragStart / nodeDragChange.
      if (SKIP_AUTO_SAVE_CHECK_FOR_EVENTS.includes(state.lastChangeName)) {
        return;
      }

      cancelPendingAutoSave();

      const { lastSaveAttemptTimestamp } = useIntegrationStore.getState();
      const differenceInSeconds = (state.lastChangeTimestamp - lastSaveAttemptTimestamp) / 1000;

      if (AUTO_SAVE_IF_CHANGED_OVER_X_SECONDS_AGO < differenceInSeconds) {
        timeoutRef.current = setTimeout(() => onSaveRef.current({ isAutoSave: true }), AUTO_SAVE_DELAY_IN_MS);
      }
    });

    // A save (manual or auto) bumps lastSaveAttemptTimestamp; drop any pending
    // autosave so we don't fire a redundant one right after it.
    const unsubscribeSave = useIntegrationStore.subscribe((state, previousState) => {
      if (state.lastSaveAttemptTimestamp !== previousState.lastSaveAttemptTimestamp) {
        cancelPendingAutoSave();
      }
    });

    return () => {
      unsubscribeChanges();
      unsubscribeSave();
      cancelPendingAutoSave();
    };
  }, []);
}
