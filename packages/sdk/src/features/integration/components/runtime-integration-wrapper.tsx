import { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { getStoreDataForIntegration } from '../../../store/slices/diagram-slice/actions';
import type {
  IntegrationDataFormatOptional,
  IntegrationStrategy,
  OnSave,
  OnSaveExternal,
} from '../../../types/integration';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../utils/show-snackbar';
import { IntegrationWrapper } from './integration-variants/wrapper/integration-wrapper';

const localStorageDiagramKey = 'workflowBuilderDiagram';

type Props = PropsWithChildren<
  IntegrationDataFormatOptional & {
    strategy: IntegrationStrategy;
    endpoints?: { load: string; save: string };
    onDataSave?: OnSaveExternal;
  }
>;

export function RuntimeIntegrationWrapper({
  strategy,
  endpoints,
  onDataSave,
  name: nameProperty,
  globalVariables: globalVariablesProperty,
  layoutDirection: layoutDirectionProperty,
  nodes: nodesProperty,
  edges: edgesProperty,
  children,
}: Props) {
  const [{ name, globalVariables, layoutDirection, nodes, edges }, setData] = useState<IntegrationDataFormatOptional>(
    () => ({
      name: nameProperty,
      globalVariables: globalVariablesProperty,
      layoutDirection: layoutDirectionProperty,
      nodes: nodesProperty,
      edges: edgesProperty,
    }),
  );

  useEffect(() => {
    if (strategy === 'localStorage') {
      const stored = localStorage.getItem(localStorageDiagramKey);
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as IntegrationDataFormatOptional;
        setData({
          name: parsed.name,
          globalVariables: parsed.globalVariables,
          layoutDirection: parsed.layoutDirection,
          nodes: parsed.nodes,
          edges: parsed.edges,
        });
      } catch {
        //
      }
    } else if (strategy === 'api' && endpoints?.load) {
      (async () => {
        try {
          const response = await fetch(endpoints.load);
          if (!response.ok) return;
          const data = (await response.json()) as IntegrationDataFormatOptional | undefined;
          if (data) setData(data);
        } catch {
          //
        }
      })();
    }
    // 'props' strategy: initial data comes from props, already set in useState initializer
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave: OnSave = useCallback(
    async (savingParams) => {
      const data = getStoreDataForIntegration();

      if (strategy === 'localStorage') {
        try {
          localStorage.setItem(localStorageDiagramKey, JSON.stringify(data));
          return new Promise((resolve) => {
            setTimeout(() => {
              showSnackbarSaveSuccessIfNeeded(savingParams);
              resolve('success');
            }, 800);
          });
        } catch {
          //
        }
      } else if (strategy === 'api' && endpoints?.save) {
        try {
          const response = await fetch(endpoints.save, {
            body: JSON.stringify(data),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            showSnackbarSaveSuccessIfNeeded(savingParams);
            return 'success';
          }
        } catch {
          //
        }
      } else if (strategy === 'props' && onDataSave) {
        try {
          const didSave = await onDataSave(data, savingParams);
          if (didSave) {
            showSnackbarSaveSuccessIfNeeded(savingParams);
            return 'success';
          }
        } catch {
          //
        }
      }

      showSnackbarSaveErrorIfNeeded(savingParams);
      return 'error';
    },
    [strategy, endpoints?.save, onDataSave],
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
      {children}
    </IntegrationWrapper>
  );
}
