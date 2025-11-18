import { useCallback } from 'react';

import { IntegrationWrapper } from './wrapper/integration-wrapper';

import { getStoreDataForIntegration } from '@/store/slices/diagram-slice/actions';

import { OnSave, OnSaveExternal } from '@/features/integration/types';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';
import { Prettify } from '@/utils/typescript';

type Props = Omit<React.ComponentProps<typeof IntegrationWrapper>, 'onSave'> & { onDataSave: OnSaveExternal };

export function withIntegrationThroughProps<WProps extends object>(WrappedComponent: React.ComponentType<WProps>) {
  function WithIntegrationComponent(
    propsForWrapperAndIntegration: Prettify<Props & React.ComponentProps<typeof WrappedComponent>>,
  ) {
    const { name, layoutDirection, nodes, edges, onDataSave, ...props } = propsForWrapperAndIntegration;

    const handleSave: OnSave = useCallback(
      async (savingParams) => {
        const data = getStoreDataForIntegration();

        try {
          const didSave = await onDataSave(data, savingParams);

          if (didSave) {
            showSnackbarSaveSuccessIfNeeded(savingParams);

            return 'success';
          }
        } catch {
          //
        }

        showSnackbarSaveErrorIfNeeded(savingParams);

        return 'error';
      },
      [onDataSave],
    );

    return (
      <IntegrationWrapper name={name} layoutDirection={layoutDirection} nodes={nodes} edges={edges} onSave={handleSave}>
        <WrappedComponent {...(props as React.ComponentProps<typeof WrappedComponent>)} />
      </IntegrationWrapper>
    );
  }

  return WithIntegrationComponent;
}
