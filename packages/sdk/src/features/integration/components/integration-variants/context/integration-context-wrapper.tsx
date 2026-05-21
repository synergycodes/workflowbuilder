import { type PropsWithChildren, createContext, useCallback, useMemo } from 'react';

import type { OnSave } from '../../../../../types/integration';
import { trackFutureChange } from '../../../../changes-tracker/stores/use-changes-tracker-store';
import { getStoreSavingStatus, setStoreSavingStatus } from '../../../stores/use-integration-store';

/*
  Context is really only used for onSave, because if we are integrating through
  props and want to use save somewhere deep inside the application,
  the context wraps that onSave so it doesn't lose that reference.
*/

type IntegrationContextType = {
  onSave: OnSave;
};

export const IntegrationContext = createContext<IntegrationContextType>({
  // Default value
  onSave: async () => {
    console.error('Missing onSave callback in the context.');

    return 'error';
  },
});

type Props = PropsWithChildren<IntegrationContextType>;

export function IntegrationContextWrapper({ onSave, children }: Props) {
  /*
    This handler wraps the onSave function from the selected integration HOC
    and adds support for pending status.
  */
  const handleIntegrationSave: OnSave = useCallback(
    async (savingParams) => {
      const savingStatus = getStoreSavingStatus();

      if (savingStatus === 'saving') {
        return 'alreadyStarted';
      }

      setStoreSavingStatus('saving');

      const didSaveStatus = await onSave(savingParams);

      if (didSaveStatus === 'success') {
        setStoreSavingStatus('saved');

        if (!savingParams?.isAutoSave) {
          trackFutureChange('manualSave');
        }
      } else {
        // It doesn't show errors for autosaving, but you can make it do so if you wish.
        setStoreSavingStatus(savingParams?.isAutoSave ? 'waiting' : 'notSaved');
      }

      return didSaveStatus;
    },
    [onSave],
  );

  const value = useMemo(
    () => ({
      onSave: handleIntegrationSave,
    }),
    [handleIntegrationSave],
  );

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}
