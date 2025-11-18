import { useContext, useEffect, useRef } from 'react';
import { IntegrationContext } from '../components/integration-variants/context/integration-context-wrapper';
import { useChangesTrackerStore } from '@/features/changes-tracker/stores/use-changes-tracker-store';
import { useIntegrationStore } from '../stores/use-integration-store';
import { AUTO_SAVE_IF_CHANGED_OVER_X_SECONDS_AGO, SKIP_AUTO_SAVE_CHECK_FOR_EVENTS } from '../consts';

/*
  If many changes happen at once, it waits for a while to save the end state.
*/
const AUTO_SAVE_DELAY_IN_MS = 400;

export function useAutoSave() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastChangeName = useChangesTrackerStore((store) => store.lastChangeName);
  const lastChangeTimestamp = useChangesTrackerStore((store) => store.lastChangeTimestamp);
  const lastSaveAttemptTimestamp = useIntegrationStore((state) => state.lastSaveAttemptTimestamp);

  const { onSave } = useContext(IntegrationContext);

  useEffect(() => {
    // For example nodeDragStart
    const shouldSkipAutoSave = SKIP_AUTO_SAVE_CHECK_FOR_EVENTS.includes(lastChangeName);

    if (shouldSkipAutoSave) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const differenceInSeconds = (lastChangeTimestamp - lastSaveAttemptTimestamp) / 1000;

    const isDifferenceLongEnough = AUTO_SAVE_IF_CHANGED_OVER_X_SECONDS_AGO < differenceInSeconds;

    if (isDifferenceLongEnough) {
      timeoutRef.current = setTimeout(() => onSave({ isAutoSave: true }), AUTO_SAVE_DELAY_IN_MS);
    }
  }, [lastChangeName, lastChangeTimestamp, lastSaveAttemptTimestamp, onSave]);
}
