import { type PropsWithChildren, type RefObject, createContext, useLayoutEffect, useRef, useState } from 'react';

import { createWorkflowBuilderActions } from '../../../../../hooks/create-workflow-builder-actions';
import type { WorkflowBuilderActions } from '../../../../../hooks/use-workflow-builder-actions';
import type { OnSave } from '../../../../../types/integration';
import { trackFutureChange } from '../../../../changes-tracker/stores/use-changes-tracker-store';
import {
  getStoreDataSnapshot,
  getStoreSavingStatus,
  hasUnsavedChanges,
  setStoreSavedData,
  setStoreSavingStatus,
} from '../../../stores/use-integration-store';
import { showSnackbarSaveErrorIfNeeded } from '../../../utils/show-snackbar';

/*
  Context carries the Root's save and actions, so a save deep inside the application
  goes through the integration of this Root mount and never through a previous one.
*/

type IntegrationContextType = {
  onSave: OnSave;
  actions: WorkflowBuilderActions;
};

const missingOnSave: OnSave = async () => {
  console.error('Missing onSave callback in the context.');

  return 'error';
};

export const IntegrationContext = createContext<IntegrationContextType>({
  // Default value
  onSave: missingOnSave,
  actions: createWorkflowBuilderActions({ save: () => missingOnSave({ isAutoSave: false }), isActive: () => true }),
});

type Props = PropsWithChildren<{ onSave: OnSave; autoSave: boolean }>;

type Session = { onSave: OnSave; autoSave: boolean; isMounted: boolean };

export function IntegrationContextWrapper({ onSave, autoSave, children }: Props) {
  const sessionRef = useRef<Session>({ onSave, autoSave, isMounted: false });

  useLayoutEffect(() => {
    sessionRef.current.onSave = onSave;
    sessionRef.current.autoSave = autoSave;
  }, [onSave, autoSave]);

  const [value] = useState<IntegrationContextType>(() => {
    const isActive = () => sessionRef.current.isMounted;
    const save: OnSave = (savingParams) => {
      if (!isActive()) return Promise.resolve('error');
      if (savingParams?.isAutoSave && !(sessionRef.current.autoSave && hasUnsavedChanges())) {
        return Promise.resolve('success');
      }
      return saveThroughIntegration(sessionRef.current.onSave, savingParams, isActive);
    };

    return {
      onSave: save,
      actions: createWorkflowBuilderActions({ save: () => save({ isAutoSave: false }), isActive }),
    };
  });

  return (
    <IntegrationContext.Provider value={value}>
      <MountTracker session={sessionRef} />
      {children}
    </IntegrationContext.Provider>
  );
}

function MountTracker({ session }: { session: RefObject<Session> }) {
  useLayoutEffect(() => {
    const current = session.current;
    current.isMounted = true;
    return () => {
      current.isMounted = false;
    };
  }, [session]);

  return null;
}

/*
  This handler wraps the onSave function from the selected integration
  and adds support for pending status.
*/
const saveThroughIntegration = async (onSave: OnSave, savingParams: Parameters<OnSave>[0], isActive: () => boolean) => {
  const savingStatus = getStoreSavingStatus();

  // 'disabled' until loadData ran: a save before that would send the reset, empty store over the stored diagram.
  if (savingStatus === 'disabled') {
    return 'error';
  }

  if (savingStatus === 'loadFailed') {
    showSnackbarSaveErrorIfNeeded(savingParams);
    return 'error';
  }

  if (savingStatus === 'saving') {
    return 'alreadyStarted';
  }

  setStoreSavingStatus('saving');

  const sentData = getStoreDataSnapshot();
  const didSaveStatus = await onSave(savingParams);

  if (!isActive()) {
    return didSaveStatus;
  }

  if (didSaveStatus === 'success') {
    setStoreSavingStatus('saved');
    setStoreSavedData(sentData);

    if (!savingParams?.isAutoSave) {
      trackFutureChange('manualSave');
    }
  } else {
    // It doesn't show errors for autosaving, but you can make it do so if you wish.
    setStoreSavingStatus(savingParams?.isAutoSave ? 'waiting' : 'notSaved');
  }

  return didSaveStatus;
};
