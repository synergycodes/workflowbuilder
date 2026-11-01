import { type Context, type ReactNode, createContext, useContext } from 'react';

// One context per page, also when the SDK bundle and the host each load a copy of this module.
const CONTEXT_KEY = Symbol.for('@workflowbuilder/ui/portal-container@2');
const shared = globalThis as Record<symbol, unknown>;
const PortalContainerContext = (shared[CONTEXT_KEY] ??= createContext<HTMLElement | null | undefined>(
  undefined,
)) as Context<HTMLElement | null | undefined>;

type PortalContainerProviderProps = {
  /** The element popups render into; `null` while it does not exist yet, so popups wait for it. */
  container: HTMLElement | null;
  children: ReactNode;
};

/**
 * Renders every popup of the components inside it (Select, Menu, Tooltip, DatePicker, Modal) into
 * `container` instead of `document.body`, so popups inherit that element's class, theme and language.
 */
export function PortalContainerProvider({ container, children }: PortalContainerProviderProps) {
  return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;
}

/**
 * The popup container from the nearest provider: `null` while the provider has none yet, `undefined`
 * outside a provider, where popups use `document.body`.
 */
export function usePortalContainer(): HTMLElement | null | undefined {
  return useContext(PortalContainerContext);
}
