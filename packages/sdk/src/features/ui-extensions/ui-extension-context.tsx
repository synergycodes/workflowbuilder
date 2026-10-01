import { type PropsWithChildren, createContext, useContext, useRef, useSyncExternalStore } from 'react';

import {
  type AreaId,
  type AreaSlot,
  EMPTY_SLOT,
  type MenuId,
  type RegisteredMenuItem,
  type UiExtensionRegistry,
  createUiExtensionRegistry,
} from './ui-extension-registry';

const UiExtensionContext = createContext<UiExtensionRegistry | null>(null);

const NO_MENU_ITEMS: readonly RegisteredMenuItem[] = Object.freeze([]);

function subscribeToNothing() {
  return () => {};
}

/** Gives its subtree a registry of its own, so every mount of the Root starts empty. */
export function UiExtensionProvider({ children }: PropsWithChildren) {
  const registryRef = useRef<UiExtensionRegistry | null>(null);
  if (registryRef.current === null) {
    registryRef.current = createUiExtensionRegistry();
  }

  return <UiExtensionContext.Provider value={registryRef.current}>{children}</UiExtensionContext.Provider>;
}

/** The registry of the enclosing Root, or `null` outside one. */
export function useUiExtensionRegistry(): UiExtensionRegistry | null {
  return useContext(UiExtensionContext);
}

export function useAreaSlot(area: AreaId): AreaSlot {
  const registry = useUiExtensionRegistry();
  const getSnapshot = () => (registry ? registry.getAreaSlot(area) : EMPTY_SLOT);

  return useSyncExternalStore(registry?.subscribe ?? subscribeToNothing, getSnapshot, getSnapshot);
}

/**
 * Call it in a component that does not render that menu's producers: a producer's inline `icon`
 * re-registers on every render, so a reader above it would loop.
 */
export function useRegisteredMenuItems(menu: MenuId): readonly RegisteredMenuItem[] {
  const registry = useUiExtensionRegistry();
  const getSnapshot = () => (registry ? registry.getMenuItems(menu) : NO_MENU_ITEMS);

  return useSyncExternalStore(registry?.subscribe ?? subscribeToNothing, getSnapshot, getSnapshot);
}
