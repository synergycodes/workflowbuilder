import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import type { LayoutDirection } from '../../../../node/common';
import { useStore } from '../../../../store/store';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { useHeaderSupply, useIsCleanUpPending } from '../../../ui-extensions/ui-extension-context';

export function useCleanUp() {
  const { cleanUp } = useWorkflowBuilderActions();
  const isVisible = useIsBuiltInControlVisible('cleanUp');
  const isSupplied = useHeaderSupply('cleanUp') !== undefined;
  const layoutDirection = useStore((state) => state.layoutDirection);
  const isEmptyCanvas = useStore((state) => state.nodes.length === 0);
  const isReadOnly = useStore((state) => state.isReadOnly);
  const isPending = useIsCleanUpPending();

  return {
    isAvailable: isVisible && isSupplied,
    layoutDirection,
    isPending,
    isDisabled: isEmptyCanvas || isReadOnly,
    /** Without a direction, cleans up in the current one. */
    cleanUp: (direction?: LayoutDirection) => void cleanUp(direction),
  };
}
