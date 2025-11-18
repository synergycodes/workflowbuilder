import { useCallback, useMemo } from 'react';

import { IntegrationWrapper } from './wrapper/integration-wrapper';

import { getStoreDataForIntegration } from '@/store/slices/diagram-slice/actions';

import { IntegrationDataFormatOptional, OnSave } from '@/features/integration/types';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';

const localStorageDiagramKey = 'workflowBuilderDiagram';

export function withIntegrationThroughLocalStorage<WProps extends object>(
  WrappedComponent: React.ComponentType<WProps>,
) {
  function WithIntegrationComponent(props: React.ComponentProps<typeof WrappedComponent>) {
    const handleSave: OnSave = useCallback(async (savingParams) => {
      const data = getStoreDataForIntegration();

      try {
        localStorage.setItem(localStorageDiagramKey, JSON.stringify(data));

        /*
          showSnackbarSaveSuccessIfNeeded(savingParams);

          return 'success';

          The timeout here is just to show how the pending state works during saving.

          Fell free to remove it and use code above.
        */
        return new Promise((resolve) => {
          setTimeout(() => {
            showSnackbarSaveSuccessIfNeeded(savingParams);

            return resolve('success');
          }, 800);
        });
      } catch {
        //
      }

      showSnackbarSaveErrorIfNeeded(savingParams);

      return 'error';
    }, []);

    const { name, layoutDirection, nodes, edges }: IntegrationDataFormatOptional = useMemo(() => {
      const data = localStorage.getItem(localStorageDiagramKey);
      if (!data) {
        return {};
      }

      try {
        const { name, layoutDirection, nodes, edges } =
          (JSON.parse(data) as unknown as IntegrationDataFormatOptional) || {};

        return {
          name,
          layoutDirection,
          nodes,
          edges,
        };
      } catch {
        //
      }

      return {};
    }, []);

    return (
      <IntegrationWrapper name={name} layoutDirection={layoutDirection} nodes={nodes} edges={edges} onSave={handleSave}>
        <WrappedComponent {...props} />
      </IntegrationWrapper>
    );
  }

  return WithIntegrationComponent;
}
