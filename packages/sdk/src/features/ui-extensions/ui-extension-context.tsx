import { type PropsWithChildren, createContext, useContext, useRef, useSyncExternalStore } from 'react';

import { useIsBuiltInControlVisible } from './built-in-controls-context';
import {
  type AreaId,
  type AreaPlace,
  type AreaSlot,
  EMPTY_SLOT,
  type HeaderSupplies,
  type HeaderSupplyKind,
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

export function useAreaSlot(area: AreaId, place: AreaPlace = 'before'): AreaSlot {
  const registry = useUiExtensionRegistry();
  const getSnapshot = () => (registry ? registry.getAreaSlot(area, place) : EMPTY_SLOT);

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

export function useHeaderSupply<K extends HeaderSupplyKind>(kind: K): HeaderSupplies[K] | undefined {
  const registry = useUiExtensionRegistry();
  const getSnapshot = () => registry?.getHeaderSupply(kind);

  return useSyncExternalStore(registry?.subscribe ?? subscribeToNothing, getSnapshot, getSnapshot);
}

/** Whether the built-in control of that kind shows: not hidden by `builtInControls`, and supplied. */
export function useIsHeaderControlShown(kind: HeaderSupplyKind): boolean {
  const isVisible = useIsBuiltInControlVisible(kind);
  const isSupplied = useHeaderSupply(kind) !== undefined;

  return isVisible && isSupplied;
}

export function useIsCleanUpPending(): boolean {
  const registry = useUiExtensionRegistry();
  const getSnapshot = () => registry?.isCleanUpPending() ?? false;

  return useSyncExternalStore(registry?.subscribe ?? subscribeToNothing, getSnapshot, getSnapshot);
}
