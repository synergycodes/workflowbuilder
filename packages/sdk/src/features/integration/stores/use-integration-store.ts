import { SnackbarType } from '@workflowbuilder/ui';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { setStoreDataFromIntegration } from '../../../store/slices/diagram-slice/actions';
import type { IntegrationDataFormat } from '../../../types/integration';
import { showTranslatedSnackbar } from '../../../utils/show-translated-snackbar';

type IntegrationSavingStatus = 'disabled' | 'waiting' | 'saving' | 'saved' | 'notSaved';

type IntegrationStore = {
  savingStatus: IntegrationSavingStatus;
  lastSaveAttemptTimestamp: number;
};

export const useIntegrationStore = create<IntegrationStore>()(
  devtools(
    () =>
      ({
        savingStatus: 'disabled',
        lastSaveAttemptTimestamp: Date.now(),
      }) satisfies IntegrationStore,
    { name: 'integrationStore' },
  ),
);

export function loadData(loadData: Partial<IntegrationDataFormat>): { isEmpty: boolean } {
  const hasAnyData = Object.values(loadData).some(Boolean);
  const isEmpty = !loadData.nodes?.length;
  if (hasAnyData) {
    setStoreDataFromIntegration(loadData);
  }
  // A name alone is applied silently: the welcome template selector follows for an empty diagram.
  if (!isEmpty) {
    showTranslatedSnackbar({
      title: 'restoreDiagramSuccess',
      variant: SnackbarType.SUCCESS,
    });
  }

  useIntegrationStore.setState({
    savingStatus: 'waiting',
    lastSaveAttemptTimestamp: Date.now(),
  });

  return { isEmpty };
}

/** Back to 'disabled' for a new Root mount: the store is module-level, so a remount would otherwise start as loaded. */
export function resetIntegrationStore() {
  useIntegrationStore.setState({ savingStatus: 'disabled', lastSaveAttemptTimestamp: Date.now() });
}

export function getStoreSavingStatus() {
  return useIntegrationStore.getState().savingStatus;
}

export function setStoreSavingStatus(savingStatus: IntegrationSavingStatus) {
  return useIntegrationStore.setState((state) => ({
    savingStatus,
    lastSaveAttemptTimestamp: savingStatus === 'saved' ? Date.now() : state.lastSaveAttemptTimestamp,
  }));
}
