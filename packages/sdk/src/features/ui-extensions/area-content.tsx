import { useNodeId } from '@xyflow/react';
import type { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

import { useAreaSlot, useUiExtensionRegistry } from './ui-extension-context';
import type { AreaId } from './ui-extension-registry';
import { usePlacementWarning } from './use-placement-warning';

export type AreaContentProps = PropsWithChildren<{
  area: AreaId;
  /** The public component's name, for placement warnings. */
  componentName: string;
}>;

/**
 * Renders its children in the area's target while the area's host is mounted, and nothing before
 * that or outside `<WorkflowBuilder.Root>`. The children stay in the tree where they were rendered:
 * the parent's state and context survive and events bubble to it; the portal subtree remounts when
 * the area's host unmounts.
 */
export function AreaContent({ area, componentName, children }: AreaContentProps) {
  const registry = useUiExtensionRegistry();
  const nodeId = useNodeId();
  usePlacementWarning(
    registry === null,
    `[@workflowbuilder/sdk] <${componentName}> renders nothing outside <WorkflowBuilder.Root>.`,
  );
  usePlacementWarning(
    nodeId !== null,
    `[@workflowbuilder/sdk] <${componentName}> is rendered inside a canvas node, so every node adds its own copy. Render it once, outside the canvas.`,
  );
  const { element } = useAreaSlot(area);

  return element ? createPortal(children, element) : null;
}
