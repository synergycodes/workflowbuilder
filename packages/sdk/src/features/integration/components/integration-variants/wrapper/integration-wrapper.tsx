import { type PropsWithChildren, useEffect, useRef } from 'react';

import type { IntegrationDataFormatOptional, OnSave } from '../../../../../types/integration';
import type { WorkflowBuilderStartContext } from '../../../../../workflow-builder-root/workflow-builder-root.types';
import { openTemplateSelectorModal } from '../../../../modals/template-selector/open-template-selector-modal';
import { loadData } from '../../../stores/use-integration-store';
import { IntegrationContextWrapper } from '../context/integration-context-wrapper';

type Props = PropsWithChildren<
  IntegrationDataFormatOptional & {
    isLoaded: boolean;
    onStart: (context: WorkflowBuilderStartContext) => void;
    onSave: OnSave;
  }
>;

export function IntegrationWrapper({
  children,
  isLoaded,
  onStart,
  name,
  globalVariables,
  layoutDirection,
  nodes,
  edges,
  onSave,
}: Props) {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Once per mount: a later run would load the initial data over the user's edits.
    if (!isLoaded || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const { isEmpty } = loadData({
      name,
      layoutDirection,
      globalVariables,
      nodes,
      edges,
    });
    onStart({ isEmpty, openTemplates: openTemplateSelectorModal });
  }, [isLoaded, onStart, edges, globalVariables, layoutDirection, name, nodes]);

  return <IntegrationContextWrapper onSave={onSave}>{children}</IntegrationContextWrapper>;
}
