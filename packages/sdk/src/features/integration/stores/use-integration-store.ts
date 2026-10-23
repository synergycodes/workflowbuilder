import { SnackbarType } from '@workflowbuilder/ui';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { getStoreDataForIntegration, setStoreDataFromIntegration } from '../../../store/slices/diagram-slice/actions';
import type { IntegrationDataFormat } from '../../../types/integration';
import { showTranslatedSnackbar } from '../../../utils/show-translated-snackbar';

type IntegrationSavingStatus = 'disabled' | 'loadFailed' | 'waiting' | 'saving' | 'saved' | 'notSaved';

type IntegrationStore = {
  savingStatus: IntegrationSavingStatus;
  lastSaveAttemptTimestamp: number;
  savedData: string | null;
};

export const useIntegrationStore = create<IntegrationStore>()(
  devtools(
    () =>
      ({
        savingStatus: 'disabled',
        lastSaveAttemptTimestamp: Date.now(),
        savedData: null,
      }) satisfies IntegrationStore,
    { name: 'integrationStore' },
  ),
);

export function loadData(
  loadData: Partial<IntegrationDataFormat>,
  { loadFailed = false }: { loadFailed?: boolean } = {},
): { isEmpty: boolean } {
  const hasAnyData = Object.values(loadData).some(Boolean);
  const isEmpty = !loadData.nodes?.length;
  if (hasAnyData) {
    setStoreDataFromIntegration(loadData);
  }
  // A name alone is applied silently: the welcome template selector follows for an empty diagram.
  if (!isEmpty && !loadFailed) {
    showTranslatedSnackbar({
      title: 'restoreDiagramSuccess',
      variant: SnackbarType.SUCCESS,
    });
  }

  useIntegrationStore.setState({
    savingStatus: loadFailed ? 'loadFailed' : 'waiting',
    lastSaveAttemptTimestamp: Date.now(),
    savedData: getStoreDataSnapshot(),
  });

  return { isEmpty };
}

/** Back to 'disabled' for a new Root mount: the store is module-level, so a remount would otherwise start as loaded. */
export function resetIntegrationStore() {
  useIntegrationStore.setState({ savingStatus: 'disabled', lastSaveAttemptTimestamp: Date.now(), savedData: null });
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

export function getStoreDataSnapshot() {
  return JSON.stringify(getStoreDataForIntegration());
}

export function hasUnsavedChanges() {
  return useIntegrationStore.getState().savedData !== getStoreDataSnapshot();
}

export function setStoreSavedData(savedData: string) {
  useIntegrationStore.setState({ savedData });
}
