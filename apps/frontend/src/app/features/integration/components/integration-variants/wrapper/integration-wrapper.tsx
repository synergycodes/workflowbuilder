import { PropsWithChildren, useEffect } from 'react';

import { loadData } from '@/features/integration/stores/use-integration-store';
import { IntegrationDataFormatOptional, OnSave } from '@/features/integration/types';

import { IntegrationContextWrapper } from '../context/integration-context-wrapper';

type Props = PropsWithChildren<
  IntegrationDataFormatOptional & {
    onSave: OnSave;
  }
>;

export function IntegrationWrapper({ children, name, layoutDirection, nodes, edges, onSave }: Props) {
  useEffect(() => {
    loadData({
      name,
      layoutDirection,
      nodes,
      edges,
    });
  }, [edges, layoutDirection, name, nodes]);

  return <IntegrationContextWrapper onSave={onSave}>{children}</IntegrationContextWrapper>;
}
