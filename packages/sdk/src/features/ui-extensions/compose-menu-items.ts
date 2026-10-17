import type { MenuItemProps } from '@workflowbuilder/ui';

import type { RegisteredMenuItem } from './ui-extension-registry';

/**
 * Orders one menu's items as the built-ins first, then the registered ones, with a single
 * separator between them when both sides have at least one item; a side with none contributes
 * neither items nor a separator.
 */
export function composeMenuItems(
  builtIns: MenuItemProps[],
  registered: readonly RegisteredMenuItem[],
): MenuItemProps[] {
  const registeredItems: MenuItemProps[] = registered.map(({ id: _id, ...item }) => item);
  if (builtIns.length === 0 || registeredItems.length === 0) {
    return [...builtIns, ...registeredItems];
  }
  return [...builtIns, { type: 'separator' }, ...registeredItems];
}
