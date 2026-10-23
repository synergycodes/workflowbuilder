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
  // The registry id keys the row, so an own label may repeat a built-in one in any language.
  if (builtIns.length === 0 || registered.length === 0) {
    return [...builtIns, ...registered];
  }
  return [...builtIns, { type: 'separator' }, ...registered];
}
