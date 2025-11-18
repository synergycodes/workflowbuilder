import { useCallback, useEffect, useState } from 'react';

import { IntegrationWrapper } from './wrapper/integration-wrapper';

import { getStoreDataForIntegration } from '@/store/slices/diagram-slice/actions';

import { IntegrationDataFormatOptional, OnSave } from '@/features/integration/types';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';

export function withIntegrationThroughApi<WProps extends object>(WrappedComponent: React.ComponentType<WProps>) {
  function WithIntegrationComponent(props: React.ComponentProps<typeof WrappedComponent>) {
    const handleSave: OnSave = useCallback(async (savingParams) => {
      const data = getStoreDataForIntegration();

      try {
        /*
          You can replace this fetch call with your own implementation.
        */
        const response = await fetch(location.origin + '/fake-api', {
          body: JSON.stringify(data),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const didSaved = response.ok;

        if (didSaved) {
          showSnackbarSaveSuccessIfNeeded(savingParams);

          return 'success';
        }
      } catch {
        //
      }

      showSnackbarSaveErrorIfNeeded(savingParams);

      return 'error';
    }, []);

    const [{ name, layoutDirection, nodes, edges }, setData] = useState<IntegrationDataFormatOptional>({});

    useEffect(() => {
      (async () => {
        try {
          /*
            You can replace this fetch call with your own implementation.
          */
          const response = await fetch(location.origin + '/fake-api');

          if (!response.ok) {
            return;
          }

          const data = (await response.json()) as unknown as IntegrationDataFormatOptional | undefined;

          if (data) {
            setData(data);
          }
        } catch {
          //
        }
      })();
    }, []);

    return (
      <IntegrationWrapper name={name} layoutDirection={layoutDirection} nodes={nodes} edges={edges} onSave={handleSave}>
        <WrappedComponent {...props} />
      </IntegrationWrapper>
    );
  }

  return WithIntegrationComponent;
}
