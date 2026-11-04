import { type ReactNode, createContext, useContext } from 'react';

import type { WorkflowBuilderEditorHeaderOptions } from '../../workflow-builder-root/workflow-builder-root.types';

const EMPTY_APP_BAR: WorkflowBuilderEditorHeaderOptions = {};

const AppBarContext = createContext<WorkflowBuilderEditorHeaderOptions>(EMPTY_APP_BAR);

export function AppBarProvider({
  value,
  children,
}: {
  value?: WorkflowBuilderEditorHeaderOptions;
  children: ReactNode;
}) {
  return <AppBarContext.Provider value={value ?? EMPTY_APP_BAR}>{children}</AppBarContext.Provider>;
}

export function useAppBar(): WorkflowBuilderEditorHeaderOptions {
  return useContext(AppBarContext);
}
