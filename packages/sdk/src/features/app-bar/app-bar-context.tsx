import { type ReactNode, createContext, useContext } from 'react';

import type { WorkflowBuilderAppBar } from '../../workflow-builder-root/workflow-builder-root.types';

const EMPTY_APP_BAR: WorkflowBuilderAppBar = {};

const AppBarContext = createContext<WorkflowBuilderAppBar>(EMPTY_APP_BAR);

export function AppBarProvider({ value, children }: { value?: WorkflowBuilderAppBar; children: ReactNode }) {
  return <AppBarContext.Provider value={value ?? EMPTY_APP_BAR}>{children}</AppBarContext.Provider>;
}

export function useAppBar(): WorkflowBuilderAppBar {
  return useContext(AppBarContext);
}
