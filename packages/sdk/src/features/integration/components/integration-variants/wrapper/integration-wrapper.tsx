import { type PropsWithChildren, useContext, useEffect, useRef } from 'react';

import type { IntegrationDataFormatOptional, OnSave } from '../../../../../types/integration';
import type { WorkflowBuilderLoadContext } from '../../../../../workflow-builder-root/workflow-builder-root.types';
import { loadData } from '../../../stores/use-integration-store';
import { IntegrationContext, IntegrationContextWrapper } from '../context/integration-context-wrapper';

type InitialLoadProps = IntegrationDataFormatOptional & {
  isLoaded: boolean;
  loadFailed: boolean;
  onLoad: (context: WorkflowBuilderLoadContext) => void;
};

type Props = PropsWithChildren<InitialLoadProps & { onSave: OnSave }>;

export function IntegrationWrapper({ children, onSave, ...initialLoadProps }: Props) {
  return (
    <IntegrationContextWrapper onSave={onSave}>
      {children}
      <InitialLoad {...initialLoadProps} />
    </IntegrationContextWrapper>
  );
}

function InitialLoad({
  isLoaded,
  loadFailed,
  onLoad,
  name,
  globalVariables,
  layoutDirection,
  nodes,
  edges,
}: InitialLoadProps) {
  const { actions } = useContext(IntegrationContext);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Once per mount: a later run would load the initial data over the user's edits.
    if (!isLoaded || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const { isEmpty } = loadData({ name, layoutDirection, globalVariables, nodes, edges }, { loadFailed });
    onLoad({ isEmpty, loadFailed, actions });
  }, [isLoaded, loadFailed, onLoad, actions, edges, globalVariables, layoutDirection, name, nodes]);

  return null;
}
