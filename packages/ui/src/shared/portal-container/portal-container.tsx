import { type ReactNode, type RefObject, createContext, useContext } from 'react';

const PortalContainerContext = createContext<RefObject<HTMLElement | null> | undefined>(undefined);

type PortalContainerProviderProps = {
  container: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * Renders every popup of the components inside it (Select, Menu, Tooltip, DatePicker, Modal) into
 * `container` instead of `document.body`, so popups inherit that element's class, theme and language.
 */
export function PortalContainerProvider({ container, children }: PortalContainerProviderProps) {
  return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;
}

/** The popup container from the nearest provider; `undefined` outside one, so popups use `document.body`. */
export function usePortalContainer(): RefObject<HTMLElement | null> | undefined {
  return useContext(PortalContainerContext);
}
