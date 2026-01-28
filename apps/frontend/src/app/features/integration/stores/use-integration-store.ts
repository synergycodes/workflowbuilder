import { SnackbarType } from '@synergycodes/overflow-ui';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { showSnackbar } from '@/utils/show-snackbar';

import { setStoreDataFromIntegration } from '@/store/slices/diagram-slice/actions';

import { openTemplateSelectorModal } from '@/features/modals/template-selector/open-template-selector-modal';

import { IntegrationDataFormat } from '../types';

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

export function loadData(loadData: Partial<IntegrationDataFormat>) {
  const hasAnyData = Object.values(loadData).some(Boolean);
  if (hasAnyData) {
    setStoreDataFromIntegration(loadData);

    showSnackbar({
      title: 'restoreDiagramSuccess',
      variant: SnackbarType.SUCCESS,
    });
  } else {
    // Welcome modal for no data
    openTemplateSelectorModal();
  }

  useIntegrationStore.setState({
    savingStatus: 'waiting',
    lastSaveAttemptTimestamp: Date.now(),
  });
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
