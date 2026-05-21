import { type PropsWithChildren, useEffect } from 'react';

import type { IntegrationDataFormatOptional, OnSave } from '../../../../../types/integration';
import { loadData } from '../../../stores/use-integration-store';
import { IntegrationContextWrapper } from '../context/integration-context-wrapper';

type Props = PropsWithChildren<
  IntegrationDataFormatOptional & {
    onSave: OnSave;
  }
>;

export function IntegrationWrapper({ children, name, globalVariables, layoutDirection, nodes, edges, onSave }: Props) {
  useEffect(() => {
    loadData({
      name,
      layoutDirection,
      globalVariables,
      nodes,
      edges,
    });
  }, [edges, globalVariables, layoutDirection, name, nodes]);

  return <IntegrationContextWrapper onSave={onSave}>{children}</IntegrationContextWrapper>;
}
