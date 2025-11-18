import { useContext, useEffect, useRef } from 'react';
import { IntegrationContext } from '../components/integration-variants/context/integration-context-wrapper';
import { useChangesTrackerStore } from '@/features/changes-tracker/stores/use-changes-tracker-store';
import { useIntegrationStore } from '../stores/use-integration-store';

export function useAutoSaveOnClose() {
  const onSaveRef = useRef<null | (() => void)>(null);

  const { onSave } = useContext(IntegrationContext);

  useEffect(() => {
    if (onSaveRef.current) {
      window.removeEventListener('beforeunload', onSaveRef.current);
    }

    onSaveRef.current = () => {
      /*
        Don't use zustand .getState directly in react components body,
        but they are fine in callbacks like this.
      */
      const lastChangeTimestamp = useChangesTrackerStore.getState().lastChangeTimestamp;
      const lastSaveAttemptTimestamp = useIntegrationStore.getState().lastSaveAttemptTimestamp;

      if (lastChangeTimestamp > lastSaveAttemptTimestamp) {
        onSave({ isAutoSave: true });
      }
    };

    window.removeEventListener('beforeunload', onSaveRef.current);

    return () => {
      if (onSaveRef.current) {
        window.removeEventListener('beforeunload', onSaveRef.current);
      }
    };
  }, [onSave]);
}
