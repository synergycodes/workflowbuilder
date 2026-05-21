import { useCallback, useMemo } from 'react';

import { getStoreDataForIntegration } from '../../../../store/slices/diagram-slice/actions';
import type { IntegrationDataFormatOptional, OnSave } from '../../../../types/integration';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';
import { IntegrationWrapper } from './wrapper/integration-wrapper';

const localStorageDiagramKey = 'workflowBuilderDiagram';

export function withIntegrationThroughLocalStorage<WProps extends object>(
  WrappedComponent: React.ComponentType<WProps>,
) {
  function WithIntegrationComponent(props: React.ComponentProps<typeof WrappedComponent>) {
    const handleSave: OnSave = useCallback(async (savingParams) => {
      const data = getStoreDataForIntegration();

      try {
        localStorage.setItem(localStorageDiagramKey, JSON.stringify(data));
        showSnackbarSaveSuccessIfNeeded(savingParams);

        return 'success';
      } catch {
        //
      }

      showSnackbarSaveErrorIfNeeded(savingParams);

      return 'error';
    }, []);

    const { name, globalVariables, layoutDirection, nodes, edges }: IntegrationDataFormatOptional = useMemo(() => {
      const data = localStorage.getItem(localStorageDiagramKey);
      if (!data) {
        return {};
      }

      try {
        const { name, globalVariables, layoutDirection, nodes, edges } =
          (JSON.parse(data) as unknown as IntegrationDataFormatOptional) || {};

        return {
          name,
          layoutDirection,
          globalVariables,
          nodes,
          edges,
        };
      } catch {
        //
      }

      return {};
    }, []);

    return (
      <IntegrationWrapper
        name={name}
        globalVariables={globalVariables}
        layoutDirection={layoutDirection}
        nodes={nodes}
        edges={edges}
        onSave={handleSave}
      >
        <WrappedComponent {...props} />
      </IntegrationWrapper>
    );
  }

  return WithIntegrationComponent;
}
