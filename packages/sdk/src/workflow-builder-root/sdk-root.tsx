import { type ReactNode, type RefObject, createContext, useContext } from 'react';

type SdkRootRef = RefObject<HTMLDivElement | null>;

const SdkRootContext = createContext<SdkRootRef | null>(null);

export function SdkRootProvider({ value, children }: { value: SdkRootRef; children: ReactNode }) {
  return <SdkRootContext.Provider value={value}>{children}</SdkRootContext.Provider>;
}

/** The editor box's ref, or `null` outside `<WorkflowBuilder.Root>`. */
export function useOptionalSdkRoot(): SdkRootRef | null {
  return useContext(SdkRootContext);
}
