import { useNodeId } from '@xyflow/react';
import { useCallback, useId, useLayoutEffect, useRef } from 'react';

import { useUiExtensionRegistry } from './ui-extension-context';
import type { MenuId, UiMenuItemProps } from './ui-extension-registry';
import { usePlacementWarning } from './use-placement-warning';

type RegisteredMenuItemProps = UiMenuItemProps & {
  menu: MenuId;
  /** The public component's name, for placement warnings. */
  componentName: string;
};

/**
 * Registers one item in a built-in menu while mounted and renders nothing itself. Items keep the
 * order in which they mounted; a prop change updates the item where it stands.
 */
export function RegisteredMenuItem({
  menu,
  componentName,
  label,
  icon,
  onClick,
  tone,
  disabled,
}: RegisteredMenuItemProps): null {
  const registry = useUiExtensionRegistry();
  const nodeId = useNodeId();
  const id = useId();
  usePlacementWarning(
    registry === null,
    `[@workflowbuilder/sdk] <${componentName}> adds no menu item outside <WorkflowBuilder.Root>.`,
  );
  usePlacementWarning(
    nodeId !== null,
    `[@workflowbuilder/sdk] <${componentName}> is rendered inside a canvas node, so every node adds its own item. Render it once, outside the canvas.`,
  );

  // An inline `onClick` is a new function on every producer render; registering a stable wrapper
  // keeps those renders from notifying the menu's host.
  const latestOnClick = useRef(onClick);
  useLayoutEffect(() => {
    latestOnClick.current = onClick;
  });
  const callLatestOnClick = useCallback(() => latestOnClick.current?.(), []);
  const hasOnClick = onClick !== undefined;

  useLayoutEffect(() => {
    registry?.upsertMenuItem(menu, {
      id,
      label,
      icon,
      onClick: hasOnClick ? callLatestOnClick : undefined,
      tone,
      disabled,
    });
  }, [registry, menu, id, label, icon, hasOnClick, callLatestOnClick, tone, disabled]);

  // Removal lives apart from the upsert, so a prop change keeps the item's position.
  useLayoutEffect(() => {
    if (!registry) return;
    return () => registry.removeMenuItem(menu, id);
  }, [registry, menu, id]);

  return null;
}
