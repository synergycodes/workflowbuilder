import { type ReactNode, type RefObject, createContext, useContext } from 'react';

export type SdkSurfaces = {
  root: RefObject<HTMLDivElement | null>;
  portal: HTMLDivElement | null;
};

const SdkSurfacesContext = createContext<SdkSurfaces | null>(null);

export function SdkSurfacesProvider({ value, children }: { value: SdkSurfaces; children: ReactNode }) {
  return <SdkSurfacesContext.Provider value={value}>{children}</SdkSurfacesContext.Provider>;
}

export function useOptionalSdkSurfaces(): SdkSurfaces | null {
  return useContext(SdkSurfacesContext);
}

export function useSdkSurfaces(): SdkSurfaces {
  const surfaces = useOptionalSdkSurfaces();
  if (!surfaces) throw new Error('useSdkSurfaces must be used inside <WorkflowBuilder.Root>');
  return surfaces;
}

export function forEachSurface(surfaces: SdkSurfaces, callback: (element: HTMLElement) => void): void {
  for (const element of [surfaces.root.current, surfaces.portal]) {
    if (element) callback(element);
  }
}
