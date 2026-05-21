import { useCallback } from 'react';

import { getStoreDataForIntegration } from '../../../../store/slices/diagram-slice/actions';
import type { OnSave, OnSaveExternal } from '../../../../types/integration';
import type { Prettify } from '../../../../utils/typescript';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';
import { IntegrationWrapper } from './wrapper/integration-wrapper';

type Props = Omit<React.ComponentProps<typeof IntegrationWrapper>, 'onSave'> & { onDataSave: OnSaveExternal };

export function withIntegrationThroughProps<WProps extends object>(WrappedComponent: React.ComponentType<WProps>) {
  function WithIntegrationComponent(
    propsForWrapperAndIntegration: Prettify<Props & React.ComponentProps<typeof WrappedComponent>>,
  ) {
    const { name, globalVariables, layoutDirection, nodes, edges, onDataSave, ...props } =
      propsForWrapperAndIntegration;

    const handleSave: OnSave = useCallback(
      async (savingParams) => {
        const data = getStoreDataForIntegration();

        try {
          const status = await onDataSave(data, savingParams);

          if (status === 'success') {
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
      <IntegrationWrapper
        name={name}
        globalVariables={globalVariables}
        layoutDirection={layoutDirection}
        nodes={nodes}
        edges={edges}
        onSave={handleSave}
      >
        <WrappedComponent {...(props as React.ComponentProps<typeof WrappedComponent>)} />
      </IntegrationWrapper>
    );
  }

  return WithIntegrationComponent;
}
