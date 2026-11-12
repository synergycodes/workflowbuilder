import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import type { LayoutDirection } from '../../../../node/common';
import { useStore } from '../../../../store/store';
import { useIsCleanUpPending, useIsHeaderControlShown } from '../../../ui-extensions/ui-extension-context';

export function useCleanUp() {
  const { cleanUp } = useWorkflowBuilderActions();
  const isAvailable = useIsHeaderControlShown('cleanUp');
  const layoutDirection = useStore((state) => state.layoutDirection);
  const isEmptyCanvas = useStore((state) => state.nodes.length === 0);
  const isReadOnly = useStore((state) => state.isReadOnly);
  const isPending = useIsCleanUpPending();

  return {
    isAvailable,
    layoutDirection,
    isPending,
    isDisabled: isEmptyCanvas || isReadOnly,
    cleanUp: (direction?: LayoutDirection) => void cleanUp(direction),
  };
}
