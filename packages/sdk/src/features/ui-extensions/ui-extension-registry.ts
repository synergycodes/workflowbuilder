import type { ReactNode } from 'react';

/** An area of the built-in interface that app content can be portalled into. */
export type AreaId =
  | 'appBarTools'
  | 'appBarControls'
  | 'paletteHeader'
  | 'paletteFooter'
  | 'propertiesPanelHeader'
  | 'propertiesPanelFooter';

/** A built-in menu that app items can be registered into. */
export type MenuId = 'project' | 'appBar' | 'propertiesPanel';

/** The portal target of an area; `element` is `null` while the area's host is unmounted. */
export type AreaSlot = { element: HTMLElement | null };

/**
 * Props of {@link ProjectMenuItem}, {@link AppBarMenuItem} and {@link PropertiesPanelMenuItem}.
 *
 * @category Components
 */
export type UiMenuItemProps = {
  /** The row's text; unique within one menu. */
  label: string;
  /** Shown before the label. */
  icon?: ReactNode;
  /** Runs when the user picks the item. The latest function always runs, so an inline arrow is fine. */
  onClick?: () => void;
  /** `'critical'` colours the label and icon for a destructive action. Defaults to `'default'`. */
  tone?: 'default' | 'critical';
  /** Shows the row but keeps it from being picked. */
  disabled?: boolean;
};

export type RegisteredMenuItem = UiMenuItemProps & { id: string };

/**
 * External store for one mounted Root, read through `useSyncExternalStore`. Every change replaces
 * the record it touches, so a snapshot changes identity whenever its content changes.
 */
export type UiExtensionRegistry = {
  subscribe(listener: () => void): () => void;
  /** Returns one shared empty slot for every area without an element. */
  getAreaSlot(area: AreaId): AreaSlot;
  setAreaElement(area: AreaId, element: HTMLElement | null): void;
  /** Items in registration order; a new array after every change of that menu. */
  getMenuItems(menu: MenuId): readonly RegisteredMenuItem[];
  /** Adds the item at the end, or replaces the item with the same `id` where it stands. */
  upsertMenuItem(menu: MenuId, item: RegisteredMenuItem): void;
  removeMenuItem(menu: MenuId, id: string): void;
};

export const EMPTY_SLOT: AreaSlot = Object.freeze({ element: null });

export function createUiExtensionRegistry(): UiExtensionRegistry {
  const listeners = new Set<() => void>();
  let areas: Partial<Record<AreaId, AreaSlot>> = {};
  let menus: Record<MenuId, readonly RegisteredMenuItem[]> = { project: [], appBar: [], propertiesPanel: [] };

  function notify() {
    for (const listener of listeners) listener();
  }

  function getAreaSlot(area: AreaId): AreaSlot {
    return areas[area] ?? EMPTY_SLOT;
  }

  function setMenuItems(menu: MenuId, items: readonly RegisteredMenuItem[]) {
    menus = { ...menus, [menu]: items };
    notify();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getAreaSlot,
    setAreaElement(area, element) {
      if (getAreaSlot(area).element === element) return;
      areas = { ...areas, [area]: element ? { element } : EMPTY_SLOT };
      notify();
    },
    getMenuItems(menu) {
      return menus[menu];
    },
    upsertMenuItem(menu, item) {
      const items = menus[menu];
      const isRegistered = items.some(({ id }) => id === item.id);
      setMenuItems(
        menu,
        isRegistered ? items.map((existing) => (existing.id === item.id ? item : existing)) : [...items, item],
      );
    },
    removeMenuItem(menu, id) {
      const items = menus[menu];
      if (!items.some((existing) => existing.id === id)) return;
      setMenuItems(
        menu,
        items.filter((existing) => existing.id !== id),
      );
    },
  };
}
