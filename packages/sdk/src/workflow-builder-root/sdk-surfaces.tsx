import { type ReactNode, type RefObject, createContext, useContext } from 'react';

export type SdkSurfaces = {
  root: RefObject<HTMLDivElement | null>;
};

const SdkSurfacesContext = createContext<SdkSurfaces | null>(null);

export function SdkSurfacesProvider({ value, children }: { value: SdkSurfaces; children: ReactNode }) {
  return <SdkSurfacesContext.Provider value={value}>{children}</SdkSurfacesContext.Provider>;
}

export function useOptionalSdkSurfaces(): SdkSurfaces | null {
  return useContext(SdkSurfacesContext);
}
